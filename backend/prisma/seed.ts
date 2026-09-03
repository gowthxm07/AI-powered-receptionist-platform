import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_USERS } from './seed-data/users';
import { DEMO_BUSINESSES } from './seed-data/businesses';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function seedUsersAndBusinesses(): Promise<{
  usersCount: number;
  businessesCount: number;
}> {
  console.log('\n--- Seeding Multi-Tenant Demo Users & Businesses ---');

  // 1. Seed Users (with secure bcrypt password hashing)
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

  // 2. Seed Businesses
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
    console.log(`  ✓ Seeded Business: ${biz.name} (Owner: ${biz.ownerId.slice(0, 8)}...)`);
  }

  return {
    usersCount: DEMO_USERS.length,
    businessesCount: DEMO_BUSINESSES.length,
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

    console.log('\n======================================================');
    console.log('🎉 Multi-Tenant Users & Businesses Seeded Successfully!');
    console.log(`  • Demo Users:      ${usersCount}`);
    console.log(`  • Demo Businesses: ${businessesCount}`);
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
