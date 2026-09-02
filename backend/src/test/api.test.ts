import { createApp } from '../app';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';
import { UserRole } from '@prisma/client';
import http from 'http';

interface TestResponse {
  status: number;
  data: any;
}

// Simple HTTP request helper for testing Express app in memory
function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const port = address.port;

    const payload = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
        ...(token && { Cookie: `${AUTH_COOKIE_NAME}=${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        try {
          const parsed = rawData ? JSON.parse(rawData) : {};
          resolve({ status: res.statusCode || 0, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, data: rawData });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

export async function runApiTestSuite() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  console.log(`\n--- Starting Express API Test Suite on Ephemeral Port ${address.port} ---`);

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

  // Generate test auth token
  const testToken = JwtUtil.generateToken({
    userId: 'test-api-user-id',
    role: UserRole.BUSINESS_OWNER,
    email: 'test.api@example.local',
  });

  try {
    // 1. Health API Test (Public)
    const healthRes = await makeRequest(server, 'GET', '/api/health');
    assert(
      healthRes.status === 200 && healthRes.data.success === true,
      'GET /api/health returns HTTP 200 with success: true',
      JSON.stringify(healthRes.data)
    );
    assert(
      healthRes.data.data?.status === 'healthy',
      'GET /api/health reports system status "healthy"'
    );

    // 2. Undefined Route 404 Test
    const notFoundRes = await makeRequest(server, 'GET', '/api/non-existent-route');
    assert(
      notFoundRes.status === 404 && notFoundRes.data.success === false,
      'GET /api/non-existent-route returns HTTP 404 with structured error',
      JSON.stringify(notFoundRes.data)
    );

    // 3. Business Validation Error Test (Authenticated)
    const invalidBusinessRes = await makeRequest(
      server,
      'POST',
      '/api/businesses',
      {
        phone: '+1-555-1234',
        email: 'not-an-email',
      },
      testToken
    );
    assert(
      invalidBusinessRes.status === 400 && invalidBusinessRes.data.success === false,
      'POST /api/businesses with invalid payload returns HTTP 400',
      JSON.stringify(invalidBusinessRes.data)
    );
    assert(
      Array.isArray(invalidBusinessRes.data.errors) && invalidBusinessRes.data.errors.length > 0,
      'POST /api/businesses returns structured validation error array'
    );

    // 4. Customer Validation Error Test (Authenticated)
    const invalidCustomerRes = await makeRequest(
      server,
      'POST',
      '/api/customers',
      {
        name: '',
        phone: '1',
      },
      testToken
    );
    assert(
      invalidCustomerRes.status === 400 && invalidCustomerRes.data.success === false,
      'POST /api/customers with empty name returns HTTP 400',
      JSON.stringify(invalidCustomerRes.data)
    );

    // 5. Staff Validation (Non-UUID BusinessId) Test (Authenticated)
    const invalidStaffRes = await makeRequest(
      server,
      'POST',
      '/api/staff',
      {
        businessId: 'invalid-uuid-string',
        name: 'Dr. John',
        email: 'john@example.com',
        role: 'Consultant',
      },
      testToken
    );
    assert(
      invalidStaffRes.status === 400 && invalidStaffRes.data.success === false,
      'POST /api/staff with invalid UUID businessId returns HTTP 400',
      JSON.stringify(invalidStaffRes.data)
    );

    // 6. Service Validation (0 duration) Test (Authenticated)
    const invalidServiceRes = await makeRequest(
      server,
      'POST',
      '/api/services',
      {
        businessId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Quick Checkup',
        durationMinutes: 0,
      },
      testToken
    );
    assert(
      invalidServiceRes.status === 400 && invalidServiceRes.data.success === false,
      'POST /api/services with 0 durationMinutes returns HTTP 400',
      JSON.stringify(invalidServiceRes.data)
    );

  } finally {
    server.close();
  }

  console.log(`\nAPI Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runApiTestSuite();
}
