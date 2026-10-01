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
    ownerId: 'u0000001-0000-0000-0000-000000000001', // Dr. Sarah Jenkins (Multiple dental clinic ownership)
    name: 'Apex Endodontics & Oral Surgery',
    phone: '+1-555-019-4920',
    email: 'care@apexendo.demo',
    address: '880 Grand Boulevard, 4th Floor, Metropolis',
    description:
      'Specialized microscopic endodontics, surgical root canals, complex tooth extractions, and emergency dental trauma care.',
    timezone: 'UTC',
  },
  {
    id: 'b0000003-0000-0000-0000-000000000003',
    ownerId: 'u0000002-0000-0000-0000-000000000002', // Marcus Vance
    name: 'Zenith Dental Implants & Periodontics',
    phone: '+1-555-019-7733',
    email: 'contact@zenithimplants.demo',
    address: '1200 Financial Plaza, Tower 2, Suite 1800, Metropolis',
    description:
      'Advanced dental implant reconstruction, precision 3D-guided surgery, regenerative bone grafting, and specialized periodontics.',
    timezone: 'UTC',
  },
  {
    id: 'b0000004-0000-0000-0000-000000000004',
    ownerId: 'u0000003-0000-0000-0000-000000000003', // Elena Rostova
    name: 'Radiance Pediatric & Orthodontic Dental',
    phone: '+1-555-019-8844',
    email: 'care@radianceortho.demo',
    address: '350 Fashion Island Avenue, Ground Floor, Metropolis',
    description:
      'Dedicated pediatric dentistry, gentle early-childhood oral care, clear aligners, and adolescent orthodontic alignment.',
    timezone: 'UTC',
  },
];
