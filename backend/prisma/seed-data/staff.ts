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

  // --- Apex Endodontics & Oral Surgery (b0000002) ---
  {
    id: 's0000005-0000-0000-0000-000000000005',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Dr. Alistair Sterling',
    email: 'alistair.sterling@apexendo.demo',
    phone: '+1-555-202-1001',
    role: 'Board-Certified Endodontist',
    isActive: true,
  },
  {
    id: 's0000006-0000-0000-0000-000000000006',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@apexendo.demo',
    phone: '+1-555-202-1002',
    role: 'Oral & Maxillofacial Surgeon',
    isActive: true,
  },
  {
    id: 's0000007-0000-0000-0000-000000000007',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Elena Rostova, RDA',
    email: 'elena.rostova@apexendo.demo',
    phone: '+1-555-202-1003',
    role: 'Surgical Dental Assistant',
    isActive: true,
  },
  {
    id: 's0000008-0000-0000-0000-000000000008',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Jordan Lee',
    email: 'jordan.lee@apexendo.demo',
    phone: '+1-555-202-1004',
    role: 'Endodontic Care Coordinator',
    isActive: true,
  },

  // --- Zenith Dental Implants & Periodontics (b0000003) ---
  {
    id: 's0000009-0000-0000-0000-000000000009',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@zenithimplants.demo',
    phone: '+1-555-203-1001',
    role: 'Periodontist & Implantologist',
    isActive: true,
  },
  {
    id: 's0000010-0000-0000-0000-000000000010',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Dr. Liam O’Connor',
    email: 'liam.oconnor@zenithimplants.demo',
    phone: '+1-555-203-1002',
    role: 'Prosthodontist & Implant Specialist',
    isActive: true,
  },
  {
    id: 's0000011-0000-0000-0000-000000000011',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Nina Kowalski, RDH',
    email: 'nina.k@zenithimplants.demo',
    phone: '+1-555-203-1003',
    role: 'Periodontal Dental Hygienist',
    isActive: true,
  },
  {
    id: 's0000012-0000-0000-0000-000000000012',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Tariq Mansour',
    email: 'tariq.m@zenithimplants.demo',
    phone: '+1-555-203-1004',
    role: 'Implant Treatment Coordinator',
    isActive: true,
  },

  // --- Radiance Pediatric & Orthodontic Dental (b0000004) ---
  {
    id: 's0000013-0000-0000-0000-000000000013',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Dr. Maya Lin',
    email: 'maya.lin@radianceortho.demo',
    phone: '+1-555-204-1001',
    role: 'Pediatric Dental Specialist',
    isActive: true,
  },
  {
    id: 's0000014-0000-0000-0000-000000000014',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Dr. Jordan Lee',
    email: 'jordan.lee@radianceortho.demo',
    phone: '+1-555-204-1002',
    role: 'Orthodontist & Clear Aligner Specialist',
    isActive: true,
  },
  {
    id: 's0000015-0000-0000-0000-000000000015',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Chloe Bennett, RDH',
    email: 'chloe.b@radianceortho.demo',
    phone: '+1-555-204-1003',
    role: 'Pediatric Dental Hygienist',
    isActive: true,
  },
  {
    id: 's0000016-0000-0000-0000-000000000016',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Sophia Chen',
    email: 'sophia.c@radianceortho.demo',
    phone: '+1-555-204-1004',
    role: 'Orthodontic Patient Coordinator',
    isActive: true,
  },
];
