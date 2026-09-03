export interface DemoBusinessData {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  timezone: string;
}

export const DEMO_BUSINESSES: DemoBusinessData[] = [
  {
    id: 'b0000001-0000-0000-0000-000000000001',
    ownerId: 'u0000001-0000-0000-0000-000000000001', // Dr. Sarah Jenkins
    name: 'Lumina Dental Care',
    phone: '+1-555-019-2831',
    email: 'appointments@luminadental.demo',
    address: '742 Evergreen Terrace, Suite 100, Metropolis',
    description:
      'Premier family and cosmetic dentistry specializing in preventive hygiene, restorative crowns, smile makeovers, and pediatric oral care.',
    timezone: 'UTC',
  },
  {
    id: 'b0000002-0000-0000-0000-000000000002',
    ownerId: 'u0000001-0000-0000-0000-000000000001', // Dr. Sarah Jenkins (Multiple business ownership)
    name: 'Radiance Dermatology & Aesthetics',
    phone: '+1-555-019-4920',
    email: 'care@radiancederm.demo',
    address: '880 Grand Boulevard, 4th Floor, Metropolis',
    description:
      'Advanced medical dermatology, clinical skin rejuvenation therapies, laser resurfacing, and aesthetic consultation.',
    timezone: 'UTC',
  },
  {
    id: 'b0000003-0000-0000-0000-000000000003',
    ownerId: 'u0000002-0000-0000-0000-000000000002', // Marcus Vance
    name: 'Apex Strategy & Financial Advisory',
    phone: '+1-555-019-7733',
    email: 'contact@apexstrategy.demo',
    address: '1200 Financial Plaza, Tower 2, Suite 1800, Metropolis',
    description:
      'Boutique corporate consulting, strategic financial restructuring, tax advisory, and private equity transaction review.',
    timezone: 'UTC',
  },
  {
    id: 'b0000004-0000-0000-0000-000000000004',
    ownerId: 'u0000003-0000-0000-0000-000000000003', // Elena Rostova
    name: 'Zenith Luxury Hair & Spa Studio',
    phone: '+1-555-019-8844',
    email: 'concierge@zenithspa.demo',
    address: '350 Fashion Island Avenue, Ground Floor, Metropolis',
    description:
      'High-end artisanal hair styling, precision color balayage, organic facial rejuvenation, and restorative scalp therapies.',
    timezone: 'UTC',
  },
];
