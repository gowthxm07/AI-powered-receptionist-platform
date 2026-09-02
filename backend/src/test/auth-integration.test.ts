import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { PasswordUtil } from '../lib/password';
import { UserRole } from '@prisma/client';
import http from 'http';

interface TestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  data: any;
}

function makeAuthRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  cookies?: string[],
  headers?: Record<string, string>
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const port = address.port;

    const payload = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload).toString() }),
      ...(cookies && cookies.length > 0 && { Cookie: cookies.join('; ') }),
      ...(headers || {}),
    };

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        try {
          const parsed = rawData ? JSON.parse(rawData) : {};
          resolve({ status: res.statusCode || 0, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, headers: res.headers, data: rawData });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

export async function runAuthIntegrationTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  console.log(`\n======================================================`);
  console.log(`--- Running Authentication & Authorization Integration Tests ---`);
  console.log(`--- Server ephemeral port: ${address.port} ---`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  const testUserEmail = 'auth.test.owner@smartreceptionist.local';
  const testPassword = 'SecurePassword123!';
  let registeredUserId: string | null = null;
  let authCookie: string[] = [];

  try {
    // --------------------------------------------------
    // 1. REGISTER VALID USER
    // --------------------------------------------------
    console.log('1. Testing User Registration:');
    const registerRes = await makeAuthRequest(server, 'POST', '/api/auth/register', {
      name: 'Dr. Jane Owner',
      email: testUserEmail,
      password: testPassword,
      role: UserRole.BUSINESS_OWNER,
    });

    assert(
      registerRes.status === 201 && registerRes.data.success === true && registerRes.data.data?.id,
      'POST /api/auth/register creates user and returns HTTP 201'
    );
    registeredUserId = registerRes.data.data?.id;

    // Verify Set-Cookie header contains auth_token with HttpOnly
    const setCookie = registerRes.headers['set-cookie'];
    assert(
      Array.isArray(setCookie) && setCookie.some((c) => c.includes('auth_token') && c.includes('HttpOnly')),
      'Registration response sets HttpOnly auth_token cookie'
    );
    if (setCookie) {
      authCookie = setCookie.map((c) => c.split(';')[0]);
    }

    // Verify passwordHash is NEVER exposed in API response
    assert(
      registerRes.data.data.password === undefined &&
        registerRes.data.data.passwordHash === undefined,
      'Response never exposes plain password or passwordHash'
    );

    // --------------------------------------------------
    // 2. VERIFY PASSWORD HASHING IN DATABASE
    // --------------------------------------------------
    console.log('\n2. Testing Database Password Hashing:');
    if (registeredUserId) {
      const userInDb = await prisma.user.findUnique({ where: { id: registeredUserId } });
      assert(
        userInDb !== null && userInDb.passwordHash !== testPassword && userInDb.passwordHash.startsWith('$2'),
        'Prisma directly verifies password is stored as bcrypt hash in PostgreSQL'
      );
      const isHashValid = await PasswordUtil.compare(testPassword, userInDb!.passwordHash);
      assert(isHashValid, 'bcrypt compare verifies hash matches plaintext password');
    }

    // --------------------------------------------------
    // 3. REJECT DUPLICATE EMAIL REGISTRATION
    // --------------------------------------------------
    console.log('\n3. Testing Duplicate Registration Prevention:');
    const duplicateRes = await makeAuthRequest(server, 'POST', '/api/auth/register', {
      name: 'Duplicate Attempt',
      email: testUserEmail,
      password: 'AnotherPassword456!',
    });
    assert(
      duplicateRes.status === 409 && duplicateRes.data.success === false,
      'POST /api/auth/register with existing email returns HTTP 409 Conflict'
    );

    // --------------------------------------------------
    // 4. REJECT INVALID REGISTRATION PAYLOAD
    // --------------------------------------------------
    console.log('\n4. Testing Registration Validation:');
    const invalidRegRes = await makeAuthRequest(server, 'POST', '/api/auth/register', {
      name: 'A', // too short (< 2)
      email: 'not-an-email',
      password: '123', // too short (< 6)
    });
    assert(
      invalidRegRes.status === 400 && invalidRegRes.data.success === false && Array.isArray(invalidRegRes.data.errors),
      'POST /api/auth/register with invalid inputs returns HTTP 400 with structured validation errors'
    );

    // --------------------------------------------------
    // 5. LOGIN VALID USER
    // --------------------------------------------------
    console.log('\n5. Testing User Login:');
    const loginRes = await makeAuthRequest(server, 'POST', '/api/auth/login', {
      email: testUserEmail,
      password: testPassword,
    });
    assert(
      loginRes.status === 200 && loginRes.data.success === true && loginRes.data.data?.email === testUserEmail,
      'POST /api/auth/login with valid credentials returns HTTP 200 and safe user profile'
    );

    const loginSetCookie = loginRes.headers['set-cookie'];
    assert(
      Array.isArray(loginSetCookie) && loginSetCookie.some((c) => c.includes('auth_token') && c.includes('HttpOnly')),
      'Login response sets HttpOnly auth_token cookie'
    );
    if (loginSetCookie) {
      authCookie = loginSetCookie.map((c) => c.split(';')[0]);
    }

    // --------------------------------------------------
    // 6. REJECT INVALID CREDENTIALS
    // --------------------------------------------------
    console.log('\n6. Testing Invalid Login Attempts (Generic Security):');
    const wrongPassRes = await makeAuthRequest(server, 'POST', '/api/auth/login', {
      email: testUserEmail,
      password: 'WrongPassword999!',
    });
    assert(
      wrongPassRes.status === 401 && wrongPassRes.data.success === false,
      'POST /api/auth/login with wrong password returns generic HTTP 401 Unauthorized'
    );

    const nonExistentEmailRes = await makeAuthRequest(server, 'POST', '/api/auth/login', {
      email: 'nonexistent.user.12345@test.local',
      password: testPassword,
    });
    assert(
      nonExistentEmailRes.status === 401 &&
        nonExistentEmailRes.data.message === wrongPassRes.data.message,
      'Non-existent email returns identical generic 401 message (prevents enumeration)'
    );

    // --------------------------------------------------
    // 7. CURRENT USER (GET /api/auth/me)
    // --------------------------------------------------
    console.log('\n7. Testing Current User Profile (GET /api/auth/me):');
    const meRes = await makeAuthRequest(server, 'GET', '/api/auth/me', undefined, authCookie);
    assert(
      meRes.status === 200 &&
        meRes.data.success === true &&
        meRes.data.data?.id === registeredUserId &&
        meRes.data.data?.role === UserRole.BUSINESS_OWNER,
      'GET /api/auth/me with valid cookie returns authenticated user profile'
    );

    const meUnauthenticatedRes = await makeAuthRequest(server, 'GET', '/api/auth/me');
    assert(
      meUnauthenticatedRes.status === 401 && meUnauthenticatedRes.data.success === false,
      'GET /api/auth/me without cookie returns HTTP 401'
    );

    // --------------------------------------------------
    // 8. LOGOUT (POST /api/auth/logout)
    // --------------------------------------------------
    console.log('\n8. Testing Logout:');
    const logoutRes = await makeAuthRequest(server, 'POST', '/api/auth/logout', undefined, authCookie);
    assert(
      logoutRes.status === 200 && logoutRes.data.success === true,
      'POST /api/auth/logout returns HTTP 200'
    );
    const logoutSetCookie = logoutRes.headers['set-cookie'];
    assert(
      Array.isArray(logoutSetCookie) &&
        logoutSetCookie.some((c) => c.includes('auth_token=;') || c.includes('Expires=Thu, 01 Jan 1970')),
      'Logout response clears auth_token cookie'
    );

  } finally {
    // --------------------------------------------------
    // 9. CLEAN UP TEST USER
    // --------------------------------------------------
    console.log('\n9. Cleaning up test auth user:');
    try {
      if (registeredUserId) {
        await prisma.user.delete({ where: { id: registeredUserId } }).catch(() => {});
        console.log('  ✓ Test user record safely removed from PostgreSQL.');
      }
    } catch (cleanupErr) {
      console.error('Cleanup notice:', cleanupErr);
    }

    server.close();
  }

  console.log(`\n======================================================`);
  console.log(`Authentication Tests: ${passed} passed, ${failed} failed.`);
  console.log(`======================================================\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runAuthIntegrationTests();
}
