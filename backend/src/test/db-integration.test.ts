import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';
import { PasswordUtil } from '../lib/password';
import { UserRole } from '@prisma/client';
import http from 'http';

interface TestResponse {
  status: number;
  data: any;
}

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

export async function runDatabaseIntegrationTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  console.log(`\n======================================================`);
  console.log(`--- Running Real PostgreSQL Database CRUD Tests ---`);
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

  let testUserId: string | null = null;
  let testUserToken: string = '';
  let createdBusinessId: string | null = null;
  let createdCustomerId: string | null = null;
  let createdStaffId: string | null = null;
  let createdServiceId: string | null = null;

  try {
    // --------------------------------------------------
    // 0. AUTHENTICATED USER SETUP
    // --------------------------------------------------
    const pwdHash = await PasswordUtil.hash('DbTestPassword123!');
    const testUser = await prisma.user.create({
      data: {
        name: 'Database Integration Test Owner',
        email: 'db.test.owner@horizon.local',
        passwordHash: pwdHash,
        role: UserRole.BUSINESS_OWNER,
      },
    });
    testUserId = testUser.id;
    testUserToken = JwtUtil.generateToken({
      userId: testUser.id,
      role: testUser.role,
      email: testUser.email,
    });

    // --------------------------------------------------
    // 1. BUSINESS CRUD
    // --------------------------------------------------
    console.log('1. Testing Business CRUD against PostgreSQL:');
    const businessPayload = {
      name: 'Test Horizon Health Clinic',
      phone: '+1-555-TEST-BIZ',
      email: 'contact@testhorizon.com',
      address: '789 Medical Pavilion',
      description: 'Automated test business record',
      timezone: 'America/New_York',
    };

    const createBizRes = await makeRequest(
      server,
      'POST',
      '/api/businesses',
      businessPayload,
      testUserToken
    );
    assert(
      createBizRes.status === 201 && createBizRes.data.success === true && createBizRes.data.data?.id,
      'POST /api/businesses inserts new Business record into PostgreSQL',
      JSON.stringify(createBizRes.data)
    );
    createdBusinessId = createBizRes.data.data?.id;

    // Verify Business in DB directly via Prisma
    if (createdBusinessId) {
      const bizInDb = await prisma.business.findUnique({ where: { id: createdBusinessId } });
      assert(
        bizInDb !== null && bizInDb.name === businessPayload.name && bizInDb.ownerId === testUserId,
        'Prisma directly verifies Business persistence with ownerId in PostgreSQL'
      );
    }

    const listBizRes = await makeRequest(server, 'GET', '/api/businesses', undefined, testUserToken);
    assert(
      listBizRes.status === 200 &&
        Array.isArray(listBizRes.data.data) &&
        listBizRes.data.data.some((b: any) => b.id === createdBusinessId),
      'GET /api/businesses returns created Business in list'
    );

    // --------------------------------------------------
    // 2. CUSTOMER CRUD
    // --------------------------------------------------
    console.log('\n2. Testing Customer CRUD against PostgreSQL:');
    const customerPayload = {
      businessId: createdBusinessId!,
      name: 'Test Customer Alice',
      phone: '+1-555-TEST-CUST1',
      email: 'alice.test@example.com',
    };

    const createCustRes = await makeRequest(
      server,
      'POST',
      '/api/customers',
      customerPayload,
      testUserToken
    );
    assert(
      createCustRes.status === 201 && createCustRes.data.success === true && createCustRes.data.data?.id,
      'POST /api/customers inserts new Customer record into PostgreSQL',
      JSON.stringify(createCustRes.data)
    );
    createdCustomerId = createCustRes.data.data?.id;

    // Verify Customer in DB
    if (createdCustomerId) {
      const custInDb = await prisma.customer.findUnique({ where: { id: createdCustomerId } });
      assert(
        custInDb !== null && custInDb.phone === customerPayload.phone,
        'Prisma directly verifies Customer persistence in PostgreSQL'
      );
    }

    const listCustRes = await makeRequest(server, 'GET', '/api/customers', undefined, testUserToken);
    assert(
      listCustRes.status === 200 &&
        Array.isArray(listCustRes.data.data) &&
        listCustRes.data.data.some((c: any) => c.id === createdCustomerId),
      'GET /api/customers returns created Customer'
    );

    // Update Customer
    const updateCustRes = await makeRequest(
      server,
      'PUT',
      `/api/customers/${createdCustomerId}`,
      { name: 'Test Customer Alice Updated' },
      testUserToken
    );
    assert(
      updateCustRes.status === 200 && updateCustRes.data.data?.name === 'Test Customer Alice Updated',
      'PUT /api/customers/:id updates Customer record in PostgreSQL'
    );

    // --------------------------------------------------
    // 3. STAFF CREATION & FOREIGN KEY
    // --------------------------------------------------
    console.log('\n3. Testing Staff CRUD & Foreign Key:');
    const staffPayload = {
      businessId: createdBusinessId,
      name: 'Test Staff Dr. Robert',
      email: 'robert.staff@testhorizon.com',
      phone: '+1-555-STAFF-1',
      role: 'Lead Specialist',
      isActive: true,
    };

    const createStaffRes = await makeRequest(
      server,
      'POST',
      '/api/staff',
      staffPayload,
      testUserToken
    );
    assert(
      createStaffRes.status === 201 &&
        createStaffRes.data.success === true &&
        createStaffRes.data.data?.businessId === createdBusinessId,
      'POST /api/staff inserts Staff with valid Foreign Key to Business'
    );
    createdStaffId = createStaffRes.data.data?.id;

    // --------------------------------------------------
    // 4. SERVICE CREATION & FOREIGN KEY
    // --------------------------------------------------
    console.log('\n4. Testing Service Catalog CRUD & Foreign Key:');
    const servicePayload = {
      businessId: createdBusinessId,
      name: 'Test Diagnostic Intake',
      description: 'Comprehensive 45-minute consultation',
      durationMinutes: 45,
      isActive: true,
    };

    const createServRes = await makeRequest(
      server,
      'POST',
      '/api/services',
      servicePayload,
      testUserToken
    );
    assert(
      createServRes.status === 201 &&
        createServRes.data.success === true &&
        createServRes.data.data?.durationMinutes === 45,
      'POST /api/services inserts Service with valid Foreign Key to Business'
    );
    createdServiceId = createServRes.data.data?.id;

    // --------------------------------------------------
    // 5. DATABASE CONSTRAINT VERIFICATION
    // --------------------------------------------------
    console.log('\n5. Testing Database Unique Constraint Enforcement:');
    // Attempt duplicate phone creation
    const duplicateCustRes = await makeRequest(
      server,
      'POST',
      '/api/customers',
      {
        businessId: createdBusinessId!,
        name: 'Duplicate Caller',
        phone: customerPayload.phone, // Duplicate phone
        email: 'duplicate@example.com',
      },
      testUserToken
    );
    assert(
      duplicateCustRes.status === 409 && duplicateCustRes.data.success === false,
      'POST /api/customers with duplicate phone returns HTTP 409 Conflict',
      JSON.stringify(duplicateCustRes.data)
    );
    assert(
      duplicateCustRes.data.message.includes('already exists'),
      'Unique constraint error message is clean and structured'
    );

    // --------------------------------------------------
    // 6. CUSTOMER DELETION
    // --------------------------------------------------
    console.log('\n6. Testing Customer Deletion:');
    const deleteCustRes = await makeRequest(
      server,
      'DELETE',
      `/api/customers/${createdCustomerId}`,
      undefined,
      testUserToken
    );
    assert(
      deleteCustRes.status === 200 && deleteCustRes.data.success === true,
      'DELETE /api/customers/:id deletes Customer record from PostgreSQL'
    );

    const verifyDeletedRes = await makeRequest(
      server,
      'GET',
      `/api/customers/${createdCustomerId}`,
      undefined,
      testUserToken
    );
    assert(
      verifyDeletedRes.status === 404,
      'GET /api/customers/:id after deletion returns HTTP 404'
    );

  } finally {
    // --------------------------------------------------
    // 7. CLEAN UP REMAINING TEST DATA
    // --------------------------------------------------
    console.log('\n7. Cleaning up test data:');
    try {
      if (createdStaffId) {
        await prisma.staff.delete({ where: { id: createdStaffId } }).catch(() => {});
      }
      if (createdServiceId) {
        await prisma.service.delete({ where: { id: createdServiceId } }).catch(() => {});
      }
      if (createdCustomerId) {
        await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
      }
      if (createdBusinessId) {
        await prisma.business.delete({ where: { id: createdBusinessId } }).catch(() => {});
      }
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
      console.log('  ✓ Test records safely cleaned up from PostgreSQL.');
    } catch (cleanupErr) {
      console.error('Cleanup notice:', cleanupErr);
    }

    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n======================================================`);
  console.log(`PostgreSQL CRUD Verification: ${passed} passed, ${failed} failed.`);
  console.log(`======================================================\n`);
  if (failed > 0) process.exit(1);
}

// Self-run when executed directly
if (require.main === module) {
  runDatabaseIntegrationTests();
}
