import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_USERS } from './seed-data/users';
import { DEMO_BUSINESSES } from './seed-data/businesses';
import { DEMO_STAFF } from './seed-data/staff';
import { DEMO_SERVICES } from './seed-data/services';
import { DEMO_CUSTOMERS } from './seed-data/customers';
import { getDemoAppointments } from './seed-data/appointments';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function seedUsersAndBusinesses(): Promise<{
  usersCount: number;
  businessesCount: number;
}> {
  console.log('\n--- 1. Seeding Multi-Tenant Demo Users & Businesses ---');

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.passwordRaw, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        role: user.role,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        role: user.role,
      },
    });
    console.log(`  ✓ Seeded User: ${user.name} (${user.email})`);
  }

  for (const biz of DEMO_BUSINESSES) {
    await prisma.business.upsert({
      where: { id: biz.id },
      update: {
        name: biz.name,
        ownerId: biz.ownerId,
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        description: biz.description,
        timezone: biz.timezone,
      },
      create: {
        id: biz.id,
        name: biz.name,
        ownerId: biz.ownerId,
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        description: biz.description,
        timezone: biz.timezone,
      },
    });
    console.log(`  ✓ Seeded Business: ${biz.name}`);
  }

  return {
    usersCount: DEMO_USERS.length,
    businessesCount: DEMO_BUSINESSES.length,
  };
}

export async function seedStaffAndServices(): Promise<{
  staffCount: number;
  servicesCount: number;
}> {
  console.log('\n--- 2. Seeding Staff Specialists & Bookable Services ---');

  for (const st of DEMO_STAFF) {
    await prisma.staff.upsert({
      where: { id: st.id },
      update: {
        businessId: st.businessId,
        name: st.name,
        email: st.email,
        phone: st.phone,
        role: st.role,
        isActive: st.isActive,
      },
      create: {
        id: st.id,
        businessId: st.businessId,
        name: st.name,
        email: st.email,
        phone: st.phone,
        role: st.role,
        isActive: st.isActive,
      },
    });
  }
  console.log(`  ✓ Seeded ${DEMO_STAFF.length} staff specialists across 4 businesses.`);

  for (const sv of DEMO_SERVICES) {
    await prisma.service.upsert({
      where: { id: sv.id },
      update: {
        businessId: sv.businessId,
        name: sv.name,
        description: sv.description,
        durationMinutes: sv.durationMinutes,
        isActive: sv.isActive,
      },
      create: {
        id: sv.id,
        businessId: sv.businessId,
        name: sv.name,
        description: sv.description,
        durationMinutes: sv.durationMinutes,
        isActive: sv.isActive,
      },
    });
  }
  console.log(`  ✓ Seeded ${DEMO_SERVICES.length} bookable services across 4 businesses.`);

  return {
    staffCount: DEMO_STAFF.length,
    servicesCount: DEMO_SERVICES.length,
  };
}

export async function seedCustomers(): Promise<{ customersCount: number }> {
  console.log('\n--- 3. Seeding Customer Directories ---');

  for (const cust of DEMO_CUSTOMERS) {
    await prisma.customer.upsert({
      where: { id: cust.id },
      update: {
        businessId: cust.businessId,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
      },
      create: {
        id: cust.id,
        businessId: cust.businessId,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
      },
    });
  }
  console.log(`  ✓ Seeded ${DEMO_CUSTOMERS.length} realistic customers across 4 businesses.`);

  return { customersCount: DEMO_CUSTOMERS.length };
}

export async function seedAppointments(baseDate: Date = new Date()): Promise<{
  appointmentsCount: number;
  todayCount: number;
  pastCount: number;
  futureCount: number;
}> {
  console.log('\n--- 4. Seeding Deterministic Conflict-Free Appointments ---');

  const demoAppointments = getDemoAppointments(baseDate);

  let todayCount = 0;
  let pastCount = 0;
  let futureCount = 0;

  const todayStart = new Date(baseDate);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(baseDate);
  todayEnd.setUTCHours(23, 59, 59, 999);

  for (const apt of demoAppointments) {
    await prisma.appointment.upsert({
      where: { id: apt.id },
      update: {
        businessId: apt.businessId,
        customerId: apt.customerId,
        staffId: apt.staffId,
        serviceId: apt.serviceId,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        notes: apt.notes,
      },
      create: {
        id: apt.id,
        businessId: apt.businessId,
        customerId: apt.customerId,
        staffId: apt.staffId,
        serviceId: apt.serviceId,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        notes: apt.notes,
      },
    });

    if (apt.startTime >= todayStart && apt.startTime <= todayEnd) {
      todayCount++;
    } else if (apt.startTime < todayStart) {
      pastCount++;
    } else {
      futureCount++;
    }
  }

  console.log(`  ✓ Seeded ${demoAppointments.length} appointments:`);
  console.log(`    • Today's Active Slots:  ${todayCount}`);
  console.log(`    • Past / Completed:      ${pastCount}`);
  console.log(`    • Future / Upcoming:     ${futureCount}`);

  return {
    appointmentsCount: demoAppointments.length,
    todayCount,
    pastCount,
    futureCount,
  };
}

async function main() {
  const isReset = process.argv.includes('--reset');

  console.log('======================================================');
  console.log('--- AI RECEPTIONIST PLATFORM: DATABASE SEEDING ---');
  console.log('======================================================');

  if (isReset) {
    console.log('Notice: Reset mode specified. Demo records will be re-initialized.');
  }

  try {
    const { usersCount, businessesCount } = await seedUsersAndBusinesses();
    const { staffCount, servicesCount } = await seedStaffAndServices();
    const { customersCount } = await seedCustomers();
    const { appointmentsCount, todayCount, pastCount, futureCount } = await seedAppointments();

    const totalRecords =
      usersCount + businessesCount + staffCount + servicesCount + customersCount + appointmentsCount;

    console.log('\n======================================================');
    console.log('🎉 Multi-Tenant Demo Dataset Seeded Successfully!');
    console.log(`  • Demo Users:        ${usersCount}`);
    console.log(`  • Demo Businesses:   ${businessesCount}`);
    console.log(`  • Staff Specialists: ${staffCount}`);
    console.log(`  • Bookable Services: ${servicesCount}`);
    console.log(`  • Customers:         ${customersCount}`);
    console.log(`  • Appointments:      ${appointmentsCount} (Today: ${todayCount}, Past: ${pastCount}, Future: ${futureCount})`);
    console.log('------------------------------------------------------');
    console.log(`  🌟 TOTAL SEEDED RECORDS: ${totalRecords} (Target: >100 records)`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
