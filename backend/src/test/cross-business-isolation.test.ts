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

function makeAuthedRequest(
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
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload).toString() }),
      ...(token && { Cookie: `${AUTH_COOKIE_NAME}=${token}` }),
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

export async function runCrossBusinessIsolationTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  console.log(`\n================================================================`);
  console.log(`--- Running Cross-Business Data Isolation & Security Tests ---`);
  console.log(`--- Server ephemeral port: ${address.port} ---`);
  console.log(`================================================================\n`);

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

  // IDs to track and clean up
  let userAId: string = '';
  let userBId: string = '';
  let tokenA: string = '';
  let tokenB: string = '';

  let businessAId: string = '';
  let businessBId: string = '';

  let customerAId: string = '';
  let customerBId: string = '';

  let staffAId: string = '';
  let staffBId: string = '';

  let serviceAId: string = '';
  let serviceBId: string = '';

  try {
    // --------------------------------------------------
    // SETUP: Create User A & User B with their tokens
    // --------------------------------------------------
    const pwdHash = await PasswordUtil.hash('Password123!');

    const userA = await prisma.user.create({
      data: {
        name: 'Isolation User A',
        email: 'isolation.user.a@test.local',
        passwordHash: pwdHash,
        role: UserRole.BUSINESS_OWNER,
      },
    });
    userAId = userA.id;
    tokenA = JwtUtil.generateToken({ userId: userA.id, role: userA.role, email: userA.email });

    const userB = await prisma.user.create({
      data: {
        name: 'Isolation User B',
        email: 'isolation.user.b@test.local',
        passwordHash: pwdHash,
        role: UserRole.BUSINESS_OWNER,
      },
    });
    userBId = userB.id;
    tokenB = JwtUtil.generateToken({ userId: userB.id, role: userB.role, email: userB.email });

    // --------------------------------------------------
    // 0. UNAUTHENTICATED ACCESS PREVENTION
    // --------------------------------------------------
    console.log('0. Testing Unauthenticated Access Rejections:');
    const unauthBiz = await makeAuthedRequest(server, 'GET', '/api/businesses');
    assert(unauthBiz.status === 401, 'Unauthenticated GET /api/businesses returns HTTP 401');

    const unauthCust = await makeAuthedRequest(server, 'GET', '/api/customers');
    assert(unauthCust.status === 401, 'Unauthenticated GET /api/customers returns HTTP 401');

    const unauthStaff = await makeAuthedRequest(server, 'GET', '/api/staff');
    assert(unauthStaff.status === 401, 'Unauthenticated GET /api/staff returns HTTP 401');

    const unauthServ = await makeAuthedRequest(server, 'GET', '/api/services');
    assert(unauthServ.status === 401, 'Unauthenticated GET /api/services returns HTTP 401');

    // --------------------------------------------------
    // 1. BUSINESS CREATION & ACCESS ISOLATION
    // --------------------------------------------------
    console.log('\n1. Testing Business Isolation:');
    // User A creates Business A
    const createBizARes = await makeAuthedRequest(server, 'POST', '/api/businesses', {
      name: 'Alpha Dental Clinic (A)',
      phone: '+1-555-BIZ-A1',
      email: 'contact@alphadental.local',
    }, tokenA);
    assert(createBizARes.status === 201 && createBizARes.data.data?.id, 'User A creates Business A (HTTP 201)');
    businessAId = createBizARes.data.data?.id;

    // User B creates Business B
    const createBizBRes = await makeAuthedRequest(server, 'POST', '/api/businesses', {
      name: 'Beta Orthopedics (B)',
      phone: '+1-555-BIZ-B2',
      email: 'contact@betaortho.local',
    }, tokenB);
    assert(createBizBRes.status === 201 && createBizBRes.data.data?.id, 'User B creates Business B (HTTP 201)');
    businessBId = createBizBRes.data.data?.id;

    // User A can access Business A
    const getBizARes = await makeAuthedRequest(server, 'GET', `/api/businesses/${businessAId}`, undefined, tokenA);
    assert(getBizARes.status === 200 && getBizARes.data.data?.id === businessAId, 'User A can access Business A (HTTP 200)');

    // User A CANNOT access Business B
    const crossBizARes = await makeAuthedRequest(server, 'GET', `/api/businesses/${businessBId}`, undefined, tokenA);
    assert(crossBizARes.status === 403, 'User A CANNOT access Business B (HTTP 403 Forbidden)');

    // User B can access Business B
    const getBizBRes = await makeAuthedRequest(server, 'GET', `/api/businesses/${businessBId}`, undefined, tokenB);
    assert(getBizBRes.status === 200 && getBizBRes.data.data?.id === businessBId, 'User B can access Business B (HTTP 200)');

    // User B CANNOT access Business A
    const crossBizBRes = await makeAuthedRequest(server, 'GET', `/api/businesses/${businessAId}`, undefined, tokenB);
    assert(crossBizBRes.status === 403, 'User B CANNOT access Business A (HTTP 403 Forbidden)');

    // User A cannot update Business B
    const updateCrossBizRes = await makeAuthedRequest(server, 'PUT', `/api/businesses/${businessBId}`, {
      name: 'Hacked Name',
    }, tokenA);
    assert(updateCrossBizRes.status === 403, 'User A CANNOT modify Business B (HTTP 403 Forbidden)');

    // User A cannot delete Business B
    const deleteCrossBizRes = await makeAuthedRequest(server, 'DELETE', `/api/businesses/${businessBId}`, undefined, tokenA);
    assert(deleteCrossBizRes.status === 403, 'User A CANNOT delete Business B (HTTP 403 Forbidden)');

    // --------------------------------------------------
    // 2. CREATION UNDER ANOTHER USER'S BUSINESS IS REJECTED
    // --------------------------------------------------
    console.log('\n2. Testing Cross-Business Resource Creation Rejections:');
    // User A attempts to create Customer under Business B
    const crossCreateCustRes = await makeAuthedRequest(server, 'POST', '/api/customers', {
      businessId: businessBId,
      name: 'Intruder Customer',
      phone: '+1-555-INTRUDER-C',
    }, tokenA);
    assert(crossCreateCustRes.status === 403, 'User A CANNOT create Customer under Business B (HTTP 403)');

    // User A attempts to create Staff under Business B
    const crossCreateStaffRes = await makeAuthedRequest(server, 'POST', '/api/staff', {
      businessId: businessBId,
      name: 'Intruder Staff',
      email: 'intruder@betaortho.local',
      role: 'Staff',
    }, tokenA);
    assert(crossCreateStaffRes.status === 403, 'User A CANNOT create Staff under Business B (HTTP 403)');

    // User A attempts to create Service under Business B
    const crossCreateServRes = await makeAuthedRequest(server, 'POST', '/api/services', {
      businessId: businessBId,
      name: 'Intruder Service',
      durationMinutes: 30,
    }, tokenA);
    assert(crossCreateServRes.status === 403, 'User A CANNOT create Service under Business B (HTTP 403)');

    // --------------------------------------------------
    // 3. SEED RESOURCES FOR A AND B
    // --------------------------------------------------
    // User A creates Customer A, Staff A, Service A under Business A
    const custARes = await makeAuthedRequest(server, 'POST', '/api/customers', {
      businessId: businessAId,
      name: 'Customer Alice (A)',
      phone: '+1-555-CUST-AAA',
      email: 'alice@alpha.local',
    }, tokenA);
    customerAId = custARes.data.data?.id;

    const staffARes = await makeAuthedRequest(server, 'POST', '/api/staff', {
      businessId: businessAId,
      name: 'Staff Dr. Sarah (A)',
      email: 'sarah@alphadental.local',
      role: 'Dentist',
    }, tokenA);
    staffAId = staffARes.data.data?.id;

    const servARes = await makeAuthedRequest(server, 'POST', '/api/services', {
      businessId: businessAId,
      name: 'Dental Cleaning (A)',
      durationMinutes: 45,
    }, tokenA);
    serviceAId = servARes.data.data?.id;

    // User B creates Customer B, Staff B, Service B under Business B
    const custBRes = await makeAuthedRequest(server, 'POST', '/api/customers', {
      businessId: businessBId,
      name: 'Customer Bob (B)',
      phone: '+1-555-CUST-BBB',
      email: 'bob@beta.local',
    }, tokenB);
    customerBId = custBRes.data.data?.id;

    const staffBRes = await makeAuthedRequest(server, 'POST', '/api/staff', {
      businessId: businessBId,
      name: 'Staff Dr. Brian (B)',
      email: 'brian@betaortho.local',
      role: 'Surgeon',
    }, tokenB);
    staffBId = staffBRes.data.data?.id;

    const servBRes = await makeAuthedRequest(server, 'POST', '/api/services', {
      businessId: businessBId,
      name: 'Joint Consultation (B)',
      durationMinutes: 60,
    }, tokenB);
    serviceBId = servBRes.data.data?.id;

    // --------------------------------------------------
    // 4. CUSTOMER ISOLATION TESTS
    // --------------------------------------------------
    console.log('\n3. Testing Customer Data Isolation:');
    // User A can retrieve Customer A
    const getCustARes = await makeAuthedRequest(server, 'GET', `/api/customers/${customerAId}`, undefined, tokenA);
    assert(getCustARes.status === 200 && getCustARes.data.data?.name === 'Customer Alice (A)', 'User A can retrieve Customer A (HTTP 200)');

    // User A CANNOT retrieve Customer B
    const getCustBFromARes = await makeAuthedRequest(server, 'GET', `/api/customers/${customerBId}`, undefined, tokenA);
    assert(getCustBFromARes.status === 403, 'User A CANNOT retrieve Customer B (HTTP 403 Forbidden)');

    // User A CANNOT update Customer B
    const updateCustBFromARes = await makeAuthedRequest(server, 'PUT', `/api/customers/${customerBId}`, {
      name: 'Alice Hijacked Bob',
    }, tokenA);
    assert(updateCustBFromARes.status === 403, 'User A CANNOT update Customer B (HTTP 403 Forbidden)');

    // User A CANNOT delete Customer B
    const deleteCustBFromARes = await makeAuthedRequest(server, 'DELETE', `/api/customers/${customerBId}`, undefined, tokenA);
    assert(deleteCustBFromARes.status === 403, 'User A CANNOT delete Customer B (HTTP 403 Forbidden)');

    // Customer list scoping: User A list does not include Customer B
    const listCustARes = await makeAuthedRequest(server, 'GET', '/api/customers', undefined, tokenA);
    assert(
      listCustARes.status === 200 &&
        listCustARes.data.data.some((c: any) => c.id === customerAId) &&
        !listCustARes.data.data.some((c: any) => c.id === customerBId),
      'User A customer list contains Customer A and DOES NOT leak Customer B'
    );

    // Customer list scoping: User B list does not include Customer A
    const listCustBRes = await makeAuthedRequest(server, 'GET', '/api/customers', undefined, tokenB);
    assert(
      listCustBRes.status === 200 &&
        listCustBRes.data.data.some((c: any) => c.id === customerBId) &&
        !listCustBRes.data.data.some((c: any) => c.id === customerAId),
      'User B customer list contains Customer B and DOES NOT leak Customer A'
    );

    // --------------------------------------------------
    // 5. STAFF ISOLATION TESTS
    // --------------------------------------------------
    console.log('\n4. Testing Staff Data Isolation:');
    // User A can retrieve Staff A
    const getStaffARes = await makeAuthedRequest(server, 'GET', `/api/staff/${staffAId}`, undefined, tokenA);
    assert(getStaffARes.status === 200 && getStaffARes.data.data?.name === 'Staff Dr. Sarah (A)', 'User A can retrieve Staff A (HTTP 200)');

    // User A CANNOT retrieve Staff B
    const getStaffBFromARes = await makeAuthedRequest(server, 'GET', `/api/staff/${staffBId}`, undefined, tokenA);
    assert(getStaffBFromARes.status === 403, 'User A CANNOT retrieve Staff B (HTTP 403 Forbidden)');

    // User A CANNOT modify Staff B
    const updateStaffBFromARes = await makeAuthedRequest(server, 'PUT', `/api/staff/${staffBId}`, {
      name: 'Sarah Hijacked Brian',
    }, tokenA);
    assert(updateStaffBFromARes.status === 403, 'User A CANNOT modify Staff B (HTTP 403 Forbidden)');

    // User A CANNOT delete Staff B
    const deleteStaffBFromARes = await makeAuthedRequest(server, 'DELETE', `/api/staff/${staffBId}`, undefined, tokenA);
    assert(deleteStaffBFromARes.status === 403, 'User A CANNOT delete Staff B (HTTP 403 Forbidden)');

    // Staff list scoping
    const listStaffARes = await makeAuthedRequest(server, 'GET', '/api/staff', undefined, tokenA);
    assert(
      listStaffARes.status === 200 &&
        listStaffARes.data.data.some((s: any) => s.id === staffAId) &&
        !listStaffARes.data.data.some((s: any) => s.id === staffBId),
      'User A staff list contains Staff A and DOES NOT leak Staff B'
    );

    // --------------------------------------------------
    // 6. SERVICE ISOLATION TESTS
    // --------------------------------------------------
    console.log('\n5. Testing Service Catalog Data Isolation:');
    // User A can retrieve Service A
    const getServARes = await makeAuthedRequest(server, 'GET', `/api/services/${serviceAId}`, undefined, tokenA);
    assert(getServARes.status === 200 && getServARes.data.data?.name === 'Dental Cleaning (A)', 'User A can retrieve Service A (HTTP 200)');

    // User A CANNOT retrieve Service B
    const getServBFromARes = await makeAuthedRequest(server, 'GET', `/api/services/${serviceBId}`, undefined, tokenA);
    assert(getServBFromARes.status === 403, 'User A CANNOT retrieve Service B (HTTP 403 Forbidden)');

    // User A CANNOT modify Service B
    const updateServBFromARes = await makeAuthedRequest(server, 'PUT', `/api/services/${serviceBId}`, {
      durationMinutes: 90,
    }, tokenA);
    assert(updateServBFromARes.status === 403, 'User A CANNOT modify Service B (HTTP 403 Forbidden)');

    // User A CANNOT delete Service B
    const deleteServBFromARes = await makeAuthedRequest(server, 'DELETE', `/api/services/${serviceBId}`, undefined, tokenA);
    assert(deleteServBFromARes.status === 403, 'User A CANNOT delete Service B (HTTP 403 Forbidden)');

    // Service list scoping
    const listServARes = await makeAuthedRequest(server, 'GET', '/api/services', undefined, tokenA);
    assert(
      listServARes.status === 200 &&
        listServARes.data.data.some((s: any) => s.id === serviceAId) &&
        !listServARes.data.data.some((s: any) => s.id === serviceBId),
      'User A service list contains Service A and DOES NOT leak Service B'
    );

  } finally {
    // --------------------------------------------------
    // 7. CLEANUP ALL TEST DATA
    // --------------------------------------------------
    console.log('\n6. Cleaning up cross-business test data:');
    try {
      if (customerAId) await prisma.customer.delete({ where: { id: customerAId } }).catch(() => {});
      if (customerBId) await prisma.customer.delete({ where: { id: customerBId } }).catch(() => {});
      if (staffAId) await prisma.staff.delete({ where: { id: staffAId } }).catch(() => {});
      if (staffBId) await prisma.staff.delete({ where: { id: staffBId } }).catch(() => {});
      if (serviceAId) await prisma.service.delete({ where: { id: serviceAId } }).catch(() => {});
      if (serviceBId) await prisma.service.delete({ where: { id: serviceBId } }).catch(() => {});
      if (businessAId) await prisma.business.delete({ where: { id: businessAId } }).catch(() => {});
      if (businessBId) await prisma.business.delete({ where: { id: businessBId } }).catch(() => {});
      if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
      if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
      console.log('  ✓ All cross-business test data successfully cleaned up.');
    } catch (cleanupErr) {
      console.error('Cleanup notice:', cleanupErr);
    }

    server.close();
  }

  console.log(`\n================================================================`);
  console.log(`Cross-Business Isolation Tests: ${passed} passed, ${failed} failed.`);
  console.log(`================================================================\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runCrossBusinessIsolationTests();
}
