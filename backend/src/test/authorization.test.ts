import express, { Express, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';
import { UserRole } from '@prisma/client';
import cookieParser from 'cookie-parser';
import http from 'http';

function createAuthTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Test Route 1: Any authenticated user
  app.get('/api/test/protected', authenticate, (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Protected access granted', user: req.user });
  });

  // Test Route 2: Admin only
  app.get(
    '/api/test/admin-only',
    authenticate,
    authorize(UserRole.ADMIN),
    (req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Admin access granted' });
    }
  );

  // Test Route 3: Business owner or Admin
  app.get(
    '/api/test/business-manage',
    authenticate,
    authorize(UserRole.ADMIN, UserRole.BUSINESS_OWNER),
    (req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Management access granted' });
    }
  );

  return app;
}

function makeTestRequest(
  server: http.Server,
  path: string,
  cookie?: string,
  bearerToken?: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method: 'GET',
      headers: {
        ...(cookie && { Cookie: cookie }),
        ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
      },
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(rawData) });
        } catch {
          resolve({ status: res.statusCode || 0, data: rawData });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

export async function runAuthorizationMiddlewareTests() {
  const app = createAuthTestApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  console.log(`\n--- Running Role Authorization Middleware Tests on Port ${address.port} ---`);

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

  try {
    // Generate valid tokens for test roles
    const adminToken = JwtUtil.generateToken({
      userId: 'admin-uuid-1',
      role: UserRole.ADMIN,
      email: 'admin@system.local',
    });

    const ownerToken = JwtUtil.generateToken({
      userId: 'owner-uuid-2',
      role: UserRole.BUSINESS_OWNER,
      email: 'owner@business.local',
    });

    // 1. Unauthenticated request to protected route
    const unauthRes = await makeTestRequest(server, '/api/test/protected');
    assert(
      unauthRes.status === 401 && unauthRes.data.success === false,
      'Unauthenticated request to protected route is rejected with HTTP 401'
    );

    // 2. Authenticated request via cookie
    const authCookieRes = await makeTestRequest(
      server,
      '/api/test/protected',
      `${AUTH_COOKIE_NAME}=${ownerToken}`
    );
    assert(
      authCookieRes.status === 200 && authCookieRes.data.success === true,
      'Authenticated request via HTTP-only cookie succeeds with HTTP 200'
    );

    // 3. Authenticated request via Bearer token header
    const authBearerRes = await makeTestRequest(
      server,
      '/api/test/protected',
      undefined,
      adminToken
    );
    assert(
      authBearerRes.status === 200 && authBearerRes.data.success === true,
      'Authenticated request via Authorization Bearer header succeeds with HTTP 200'
    );

    // 4. Role middleware: Admin accessing admin-only route
    const adminOnAdminRes = await makeTestRequest(
      server,
      '/api/test/admin-only',
      `${AUTH_COOKIE_NAME}=${adminToken}`
    );
    assert(
      adminOnAdminRes.status === 200 && adminOnAdminRes.data.success === true,
      'ADMIN user is granted access to admin-only route (HTTP 200)'
    );

    // 5. Role middleware: Business Owner accessing admin-only route (Forbidden)
    const ownerOnAdminRes = await makeTestRequest(
      server,
      '/api/test/admin-only',
      `${AUTH_COOKIE_NAME}=${ownerToken}`
    );
    assert(
      ownerOnAdminRes.status === 403 && ownerOnAdminRes.data.success === false,
      'BUSINESS_OWNER user is rejected from admin-only route with HTTP 403 Forbidden'
    );

    // 6. Role middleware: Multi-role route allows Business Owner
    const ownerOnManageRes = await makeTestRequest(
      server,
      '/api/test/business-manage',
      `${AUTH_COOKIE_NAME}=${ownerToken}`
    );
    assert(
      ownerOnManageRes.status === 200 && ownerOnManageRes.data.success === true,
      'BUSINESS_OWNER is granted access to multi-role management route (HTTP 200)'
    );

  } finally {
    server.close();
  }

  console.log(`\nAuthorization Tests: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runAuthorizationMiddlewareTests();
}
