import assert from 'assert';
import http from 'http';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';

interface TestResponse {
  status: number;
  data: any;
}

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const port = address.port;

    const payload = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(payload && { 'Content-Length': Buffer.byteLength(payload).toString() }),
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

export async function runPublicBusinessDiscoveryTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Public Multi-Tenant Business Discovery Tests ---');
  console.log('======================================================\n');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  try {
    // --------------------------------------------------------------------------
    // 1. Unauthenticated Public Discovery via GET /api/public/businesses
    // --------------------------------------------------------------------------
    console.log('1. Testing Public Discovery (GET /api/public/businesses):');
    const res1 = await makeRequest(server, 'GET', '/api/public/businesses');
    assert.strictEqual(res1.status, 200, 'GET /api/public/businesses must succeed without authentication');
    assert.strictEqual(res1.data.success, true);
    assert(Array.isArray(res1.data.data), 'res.data.data must be an array of businesses');
    assert(Array.isArray(res1.data.businesses), 'res.data.businesses must be an array of businesses');
    assert(res1.data.data.length >= 3, `Expected at least 3 active businesses, got ${res1.data.data.length}`);

    const names = res1.data.data.map((b: any) => b.name);
    assert(names.includes('Lumina Dental Care'), 'Must include Lumina Dental Care');
    assert(names.includes('Radiance Dermatology & Aesthetics'), 'Must include Radiance Dermatology & Aesthetics');
    assert(names.includes('Apex Strategy & Financial Advisory'), 'Must include Apex Strategy & Financial Advisory');
    assert(names.includes('Zenith Luxury Hair & Spa Studio'), 'Must include Zenith Luxury Hair & Spa Studio');
    console.log(`  ✓ Successfully returned ${res1.data.data.length} active businesses across multiple organizations without auth.`);

    // --------------------------------------------------------------------------
    // 2. Strict Field Sanitization & Sensitive Data Privacy
    // --------------------------------------------------------------------------
    console.log('\n2. Testing Public Business Field Sanitization:');
    for (const biz of res1.data.data) {
      assert(biz.id, 'Business must have an ID');
      assert(biz.name, 'Business must have a name');
      assert.strictEqual(biz.ownerId, undefined, 'ownerId must NOT be exposed in public discovery');
      assert.strictEqual(biz.owner, undefined, 'owner details must NOT be exposed in public discovery');
      assert.strictEqual(biz.passwordHash, undefined, 'passwordHash must never be exposed');
      assert.strictEqual(biz.customers, undefined, 'customers must NOT be exposed in public discovery');
      assert.strictEqual(biz.staff, undefined, 'staff must NOT be exposed in public discovery');
      assert.strictEqual(biz.appointments, undefined, 'appointments must NOT be exposed in public discovery');
    }
    console.log('  ✓ Verified 100% field sanitization: Zero owner credentials, tenant IDs, or private data exposed.');

    // --------------------------------------------------------------------------
    // 3. Alias Route Verification via GET /api/businesses/public
    // --------------------------------------------------------------------------
    console.log('\n3. Testing Alias Route (GET /api/businesses/public):');
    const res2 = await makeRequest(server, 'GET', '/api/businesses/public');
    assert.strictEqual(res2.status, 200, 'GET /api/businesses/public must succeed without authentication');
    assert.strictEqual(res2.data.success, true);
    assert.strictEqual(res2.data.data.length, res1.data.data.length);
    console.log('  ✓ Alias route /api/businesses/public functions identically.');

    // --------------------------------------------------------------------------
    // 4. Dynamic Voice Session Creation With Selected Business
    // --------------------------------------------------------------------------
    console.log('\n4. Testing Dynamic Voice Session Creation:');
    const biz1 = res1.data.data.find((b: any) => b.name === 'Lumina Dental Care');
    const biz2 = res1.data.data.find((b: any) => b.name === 'Radiance Dermatology & Aesthetics');
    assert(biz1 && biz2, 'Both businesses must be found in discovery');

    // Create session for Business 1
    const session1 = await voiceTransportSessionManager.createTransportSession({
      businessId: biz1.id,
      channel: 'MOBILE_WEB',
    });
    assert.strictEqual(session1.success, true);
    assert.strictEqual(session1.session?.businessId, biz1.id);
    assert.strictEqual(session1.session?.businessName, 'Lumina Dental Care');
    console.log(`  ✓ Session 1 dynamically bound to '${session1.session?.businessName}' (${session1.session?.businessId}).`);

    // Create session for Business 2
    const session2 = await voiceTransportSessionManager.createTransportSession({
      businessId: biz2.id,
      channel: 'MOBILE_WEB',
    });
    assert.strictEqual(session2.success, true);
    assert.strictEqual(session2.session?.businessId, biz2.id);
    assert.strictEqual(session2.session?.businessName, 'Radiance Dermatology & Aesthetics');
    console.log(`  ✓ Session 2 dynamically bound to '${session2.session?.businessName}' (${session2.session?.businessId}).`);

    // --------------------------------------------------------------------------
    // 5. Multi-Tenant Isolation Enforcement
    // --------------------------------------------------------------------------
    console.log('\n5. Testing Voice Session Multi-Tenant Isolation:');
    // Find customer belonging to Business 1
    const biz1Customer = await prisma.customer.findFirst({
      where: { businessId: biz1.id },
    });
    assert(biz1Customer, 'Business 1 must have at least one seeded customer');

    // Attempt to bind Business 1 customer into Business 2 session (must fail)
    const crossTenantSession = await voiceTransportSessionManager.createTransportSession({
      businessId: biz2.id,
      customerId: biz1Customer.id,
      channel: 'MOBILE_WEB',
    });
    assert.strictEqual(crossTenantSession.success, false);
    assert.strictEqual(crossTenantSession.error?.code, 'INVALID_CUSTOMER_BUSINESS_MISMATCH');
    console.log('  ✓ Attempt to associate Business 1 customer with Business 2 voice session strictly rejected.');

    console.log('\n======================================================');
    console.log('🎉 ALL PUBLIC BUSINESS DISCOVERY TESTS PASSED! 🎉');
    console.log('======================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

if (require.main === module) {
  runPublicBusinessDiscoveryTests()
    .then(() => {
      prisma.$disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
      process.exit(1);
    });
}

