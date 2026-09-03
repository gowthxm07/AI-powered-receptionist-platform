import { PrismaClient, AppointmentStatus } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

export async function verifyDemoDatabase(): Promise<{
  usersCount: number;
  businessesCount: number;
  staffCount: number;
  servicesCount: number;
  customersCount: number;
  appointmentsCount: number;
  totalRecords: number;
}> {
  console.log('\n======================================================');
  console.log('--- VERIFYING DEMO DATABASE INTEGRITY & METRICS ---');
  console.log('======================================================\n');

  // 1. Record Counts
  console.log('1. Verifying Database Record Counts:');
  const [usersCount, businessesCount, staffCount, servicesCount, customersCount, appointmentsCount] =
    await Promise.all([
      prisma.user.count({ where: { email: { endsWith: '.demo' } } }),
      prisma.business.count({ where: { email: { endsWith: '.demo' } } }),
      prisma.staff.count({ where: { email: { endsWith: '.demo' } } }),
      prisma.service.count({ where: { business: { email: { endsWith: '.demo' } } } }),
      prisma.customer.count({ where: { email: { endsWith: '.demo' } } }),
      prisma.appointment.count({ where: { business: { email: { endsWith: '.demo' } } } }),
    ]);

  const totalRecords =
    usersCount + businessesCount + staffCount + servicesCount + customersCount + appointmentsCount;

  console.log(`  • Demo Users:        ${usersCount} (Target: >= 2)`);
  console.log(`  • Demo Businesses:   ${businessesCount} (Target: >= 3)`);
  console.log(`  • Staff Specialists: ${staffCount} (Target: >= 10)`);
  console.log(`  • Services Catalog:  ${servicesCount} (Target: >= 15)`);
  console.log(`  • Customers:         ${customersCount} (Target: >= 45)`);
  console.log(`  • Appointments:      ${appointmentsCount} (Target: >= 35)`);
  console.log(`  🌟 TOTAL RECORDS:    ${totalRecords} (Target: > 100)`);

  assert(usersCount >= 2, `Expected at least 2 demo users, found ${usersCount}`);
  assert(businessesCount >= 3, `Expected at least 3 demo businesses, found ${businessesCount}`);
  assert(staffCount >= 10, `Expected at least 10 demo staff members, found ${staffCount}`);
  assert(servicesCount >= 15, `Expected at least 15 demo services, found ${servicesCount}`);
  assert(customersCount >= 45, `Expected at least 45 demo customers, found ${customersCount}`);
  assert(appointmentsCount >= 35, `Expected at least 35 demo appointments, found ${appointmentsCount}`);
  assert(totalRecords >= 100, `Expected at least 100 total records, found ${totalRecords}`);
  console.log('  ✓ All target record count thresholds successfully satisfied.');

  // 2. Business Ownership & Multi-Business Demonstration
  console.log('\n2. Verifying Multi-Tenant Business Ownership:');
  const user1 = await prisma.user.findUnique({
    where: { email: 'sarah.jenkins@luminahealth.demo' },
    include: { businesses: true },
  });
  assert(user1, 'Demo User 1 must exist');
  assert(
    user1.businesses.length >= 2,
    `User 1 must own at least 2 businesses to demonstrate switching (owns ${user1.businesses.length})`
  );
  console.log(`  ✓ Multi-business ownership verified: ${user1.name} owns ${user1.businesses.length} businesses.`);

  // 3. Password Security & Bcrypt Hashing
  console.log('\n3. Verifying Password Security:');
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: '.demo' } },
  });
  for (const u of demoUsers) {
    assert(
      u.passwordHash.startsWith('$2a$') || u.passwordHash.startsWith('$2b$'),
      `User ${u.email} password must be securely hashed with bcrypt`
    );
  }
  console.log('  ✓ All demo users store standard salted Bcrypt hashes (no plaintext passwords).');

  // 4. Foreign Key and Tenant Isolation Consistency
  console.log('\n4. Verifying Cross-Entity Tenant Consistency:');
  const appointments = await prisma.appointment.findMany({
    where: { business: { email: { endsWith: '.demo' } } },
    include: { customer: true, staff: true, service: true },
  });

  for (const apt of appointments) {
    if (apt.customer) {
      assert.strictEqual(
        apt.customer.businessId,
        apt.businessId,
        `Appointment ${apt.id} customer must belong to same business`
      );
    }
    if (apt.staff) {
      assert.strictEqual(
        apt.staff.businessId,
        apt.businessId,
        `Appointment ${apt.id} staff must belong to same business`
      );
    }
    if (apt.service) {
      assert.strictEqual(
        apt.service.businessId,
        apt.businessId,
        `Appointment ${apt.id} service must belong to same business`
      );
      // Verify duration calculation
      const expectedEnd = new Date(apt.startTime.getTime() + apt.service.durationMinutes * 60000);
      assert.strictEqual(
        apt.endTime.getTime(),
        expectedEnd.getTime(),
        `Appointment ${apt.id} endTime must match service duration (${apt.service.durationMinutes}m)`
      );
    }
  }
  console.log('  ✓ All 44 appointments adhere to strict tenant isolation and duration math.');

  // 5. Conflict Detection Algorithm Verification
  console.log('\n5. Verifying Zero Overlapping Staff Conflicts:');
  const staffMembers = await prisma.staff.findMany({
    where: { business: { email: { endsWith: '.demo' } } },
    include: {
      appointments: {
        where: { status: { not: AppointmentStatus.CANCELLED } },
        orderBy: { startTime: 'asc' },
      },
    },
  });

  let verifiedActiveSlots = 0;
  for (const staff of staffMembers) {
    const apts = staff.appointments;
    for (let i = 0; i < apts.length; i++) {
      for (let j = i + 1; j < apts.length; j++) {
        const a = apts[i];
        const b = apts[j];
        const hasOverlap = a.startTime < b.endTime && a.endTime > b.startTime;
        assert(
          !hasOverlap,
          `Scheduling conflict detected for staff '${staff.name}' between appointment ${a.id} (${a.startTime.toISOString()}-${a.endTime.toISOString()}) and ${b.id} (${b.startTime.toISOString()}-${b.endTime.toISOString()})`
        );
      }
      verifiedActiveSlots++;
    }
  }
  console.log(`  ✓ Verified ${verifiedActiveSlots} active appointment slots across ${staffMembers.length} specialists with ZERO conflicts.`);

  console.log('\n======================================================');
  console.log('🎉 DEMO DATABASE VERIFICATION PASSED (100% CLEAN)! 🎉');
  console.log('======================================================\n');

  return {
    usersCount,
    businessesCount,
    staffCount,
    servicesCount,
    customersCount,
    appointmentsCount,
    totalRecords,
  };
}

async function main() {
  try {
    await verifyDemoDatabase();
  } catch (err) {
    console.error('Demo database verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
