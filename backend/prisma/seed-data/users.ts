import { UserRole } from '@prisma/client';

export interface DemoUserData {
  id: string;
  name: string;
  email: string;
  passwordRaw: string; // Used during seeding with bcrypt hashing
  role: UserRole;
}

// Fixed deterministic UUIDs for demo users
export const DEMO_USERS: DemoUserData[] = [
  {
    id: 'u0000001-0000-0000-0000-000000000001',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@luminahealth.demo',
    passwordRaw: 'DemoUser123!',
    role: UserRole.BUSINESS_OWNER,
  },
  {
    id: 'u0000002-0000-0000-0000-000000000002',
    name: 'Marcus Vance',
    email: 'marcus.vance@apexadvisory.demo',
    passwordRaw: 'DemoUser123!',
    role: UserRole.BUSINESS_OWNER,
  },
  {
    id: 'u0000003-0000-0000-0000-000000000003',
    name: 'Elena Rostova',
    email: 'elena.rostova@zenithsalon.demo',
    passwordRaw: 'DemoUser123!',
    role: UserRole.BUSINESS_OWNER,
  },
];
