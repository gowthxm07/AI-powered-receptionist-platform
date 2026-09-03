export interface DemoStaffData {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export const DEMO_STAFF: DemoStaffData[] = [
  // --- Lumina Dental Care (b0000001) ---
  {
    id: 's0000001-0000-0000-0000-000000000001',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Dr. Marcus Thorne',
    email: 'marcus.thorne@luminadental.demo',
    phone: '+1-555-201-1001',
    role: 'Lead General & Cosmetic Dentist',
    isActive: true,
  },
  {
    id: 's0000002-0000-0000-0000-000000000002',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Dr. Emily Chen',
    email: 'emily.chen@luminadental.demo',
    phone: '+1-555-201-1002',
    role: 'Orthodontist & Pediatric Specialist',
    isActive: true,
  },
  {
    id: 's0000003-0000-0000-0000-000000000003',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Sarah Jenkins, RDH',
    email: 'sarah.j@luminadental.demo',
    phone: '+1-555-201-1003',
    role: 'Senior Dental Hygienist',
    isActive: true,
  },
  {
    id: 's0000004-0000-0000-0000-000000000004',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'David Miller',
    email: 'david.miller@luminadental.demo',
    phone: '+1-555-201-1004',
    role: 'Clinical Assistant & Lab Tech',
    isActive: true,
  },

  // --- Radiance Dermatology & Aesthetics (b0000002) ---
  {
    id: 's0000005-0000-0000-0000-000000000005',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Dr. Alistair Sterling',
    email: 'alistair.sterling@radiancederm.demo',
    phone: '+1-555-202-1001',
    role: 'Board-Certified Dermatologist',
    isActive: true,
  },
  {
    id: 's0000006-0000-0000-0000-000000000006',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Nurse Jessica Bailey, NP',
    email: 'jessica.bailey@radiancederm.demo',
    phone: '+1-555-202-1002',
    role: 'Senior Aesthetic Nurse Practitioner',
    isActive: true,
  },
  {
    id: 's0000007-0000-0000-0000-000000000007',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@radiancederm.demo',
    phone: '+1-555-202-1003',
    role: 'Licensed Medical Esthetician',
    isActive: true,
  },
  {
    id: 's0000008-0000-0000-0000-000000000008',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Ryan Reynolds',
    email: 'ryan.reynolds@radiancederm.demo',
    phone: '+1-555-202-1004',
    role: 'Laser & Phototherapy Specialist',
    isActive: true,
  },

  // --- Apex Strategy & Financial Advisory (b0000003) ---
  {
    id: 's0000009-0000-0000-0000-000000000009',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Marcus Vance',
    email: 'marcus.v@apexstrategy.demo',
    phone: '+1-555-203-1001',
    role: 'Managing Principal & Senior Strategist',
    isActive: true,
  },
  {
    id: 's0000010-0000-0000-0000-000000000010',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Victoria Sinclair',
    email: 'victoria.sinclair@apexstrategy.demo',
    phone: '+1-555-203-1002',
    role: 'Corporate Restructuring Director',
    isActive: true,
  },
  {
    id: 's0000011-0000-0000-0000-000000000011',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Jonathan Reed',
    email: 'jonathan.reed@apexstrategy.demo',
    phone: '+1-555-203-1003',
    role: 'Private Equity & M&A Specialist',
    isActive: true,
  },
  {
    id: 's0000012-0000-0000-0000-000000000012',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Priya Sharma, CPA',
    email: 'priya.sharma@apexstrategy.demo',
    phone: '+1-555-203-1004',
    role: 'Senior Tax & Regulatory Consultant',
    isActive: true,
  },

  // --- Zenith Luxury Hair & Spa Studio (b0000004) ---
  {
    id: 's0000013-0000-0000-0000-000000000013',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Elena Rostova',
    email: 'elena.r@zenithspa.demo',
    phone: '+1-555-204-1001',
    role: 'Creative Director & Master Stylist',
    isActive: true,
  },
  {
    id: 's0000014-0000-0000-0000-000000000014',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Antoine Laurent',
    email: 'antoine.laurent@zenithspa.demo',
    phone: '+1-555-204-1002',
    role: 'Senior Balayage & French Cut Artist',
    isActive: true,
  },
  {
    id: 's0000015-0000-0000-0000-000000000015',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Maya Lin',
    email: 'maya.lin@zenithspa.demo',
    phone: '+1-555-204-1003',
    role: 'Botanical Scalp & Hydrotherapy Specialist',
    isActive: true,
  },
  {
    id: 's0000016-0000-0000-0000-000000000016',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@zenithspa.demo',
    phone: '+1-555-204-1004',
    role: 'Master Barber & Precision Groomer',
    isActive: true,
  },
];
