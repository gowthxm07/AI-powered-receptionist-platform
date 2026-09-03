export interface DemoServiceData {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
}

export const DEMO_SERVICES: DemoServiceData[] = [
  // --- Lumina Dental Care (b0000001) ---
  {
    id: 'sv000001-0000-0000-0000-000000000001',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Comprehensive Oral Exam & Digital X-Rays',
    description: 'Complete diagnostic charting, periodontal probing, and high-resolution panoramic digital imaging.',
    durationMinutes: 30,
    isActive: true,
  },
  {
    id: 'sv000002-0000-0000-0000-000000000002',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Ultrasonic Prophylaxis Hygiene Scaling',
    description: 'Advanced ultrasonic tartar removal, airflow polishing, and remineralizing fluoride varnish.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000003-0000-0000-0000-000000000003',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Laser Enamel Whitening & Brightening',
    description: 'In-office professional light-activated bleaching treatment for up to 8 shades of whitening.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000004-0000-0000-0000-000000000004',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Ceramic Crown Preparation & Digital 3D Scan',
    description: 'Precision tooth contouring, intraoral optical scanning, and custom temporary crown placement.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000005-0000-0000-0000-000000000005',
    businessId: 'b0000001-0000-0000-0000-000000000001',
    name: 'Pediatric Preventive Dental Evaluation',
    description: 'Gentle child exam, cavity-prevention sealant assessment, and friendly oral hygiene education.',
    durationMinutes: 30,
    isActive: true,
  },

  // --- Radiance Dermatology & Aesthetics (b0000002) ---
  {
    id: 'sv000006-0000-0000-0000-000000000006',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Clinical Full-Body Mole & Skin Check',
    description: 'Dermoscopic evaluation of suspicious lesions, mole mapping, and early melanoma screening.',
    durationMinutes: 30,
    isActive: true,
  },
  {
    id: 'sv000007-0000-0000-0000-000000000007',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Hydra-Infusion Clarifying Medical Facial',
    description: 'Multi-step vortex extraction, deep pore cleansing, and peptide antioxidant serum infusion.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000008-0000-0000-0000-000000000008',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Fractional Laser Resurfacing Consult',
    description: 'Customized laser treatment planning for acne scarring, skin texture, and pigmentation repair.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000009-0000-0000-0000-000000000009',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Targeted Glycolic/TCA Chemical Peel',
    description: 'Clinical exfoliating acid application targeting hyperpigmentation, fine lines, and sun damage.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000010-0000-0000-0000-000000000010',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Anti-Aging Injectables & Dermal Fillers',
    description: 'Personalized facial symmetry assessment and neuromodulator aesthetic administration.',
    durationMinutes: 60,
    isActive: true,
  },

  // --- Apex Strategy & Financial Advisory (b0000003) ---
  {
    id: 'sv000011-0000-0000-0000-000000000011',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Strategic Corporate Diagnostic Session',
    description: 'High-level business audit reviewing operational bottlenecks, unit economics, and competitive moat.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000012-0000-0000-0000-000000000012',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Capital Allocation & Scale Strategy',
    description: 'Structured advisory on equity financing, debt restructuring, and runway optimization.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000013-0000-0000-0000-000000000013',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Corporate Tax Structuring & Compliance',
    description: 'Multi-jurisdictional tax architecture, R&D tax credit capture, and audit-readiness review.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000014-0000-0000-0000-000000000014',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Mergers & Acquisitions Due Diligence',
    description: 'Financial, operational, and legal discovery review for buy-side or sell-side transactions.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000015-0000-0000-0000-000000000015',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Executive Leadership Advisory Briefing',
    description: 'Confidential advisory on organizational design, executive compensation, and succession planning.',
    durationMinutes: 60,
    isActive: true,
  },

  // --- Zenith Luxury Hair & Spa Studio (b0000004) ---
  {
    id: 'sv000016-0000-0000-0000-000000000016',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Artisanal Designer Haircut & Blowout',
    description: 'Custom face-framing precision dry cut, botanical shampoo massage, and editorial style finish.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000017-0000-0000-0000-000000000017',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Bespoke Multi-Dimensional Balayage',
    description: 'Hand-painted sun-kissed lighting, gloss toning bath, and bond-building Olaplex infusion.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000018-0000-0000-0000-000000000018',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Japanese Organic Scalp & Head Spa',
    description: 'Micro-mist steam therapy, organic botanical scrub, pressure-point meridian tension release.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000019-0000-0000-0000-000000000019',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Silk Keratin Smoothing Therapy',
    description: 'Formaldehyde-free intensive smoothing treatment eliminating frizz for up to 5 months.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000020-0000-0000-0000-000000000020',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Master Barber Beard Sculpt & Hot Towel',
    description: 'Straight razor line-up, natural beard oil conditioning, and aromatic steam towel therapy.',
    durationMinutes: 30,
    isActive: true,
  },
];
