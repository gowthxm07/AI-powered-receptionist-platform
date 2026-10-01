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

  // --- Apex Endodontics & Oral Surgery (b0000002) ---
  {
    id: 'sv000006-0000-0000-0000-000000000006',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Microscopic Root Canal Therapy',
    description: 'Advanced endodontic canal disinfection and bioceramic obturation under surgical microscope.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000007-0000-0000-0000-000000000007',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Surgical Apicoectomy & Retrograde Filling',
    description: 'Targeted root-end resection and ultrasonic preparation for refractory periapical lesions.',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'sv000008-0000-0000-0000-000000000008',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Impacted Wisdom Tooth Extraction',
    description: 'Surgical removal of symptomatic third molars with local anesthesia and PRF socket preservation.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000009-0000-0000-0000-000000000009',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Dental Trauma Stabilization & Splinting',
    description: 'Urgent repositioning and flexible splinting for subluxated, luxated, or avulsed teeth.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000010-0000-0000-0000-000000000010',
    businessId: 'b0000002-0000-0000-0000-000000000002',
    name: 'Emergency Pulpotomy & Coronal Seal',
    description: 'Immediate coronal pulp debridement and sedative dressing for acute irreversible pulpitis.',
    durationMinutes: 45,
    isActive: true,
  },

  // --- Zenith Dental Implants & Periodontics (b0000003) ---
  {
    id: 'sv000011-0000-0000-0000-000000000011',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Dental Implant Consultation & 3D Cone Beam Scan',
    description: 'Precision cone-beam computed tomography, virtual implant planning, and bone density analysis.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000012-0000-0000-0000-000000000012',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Periodontal Flap Debridement & Regenerative Therapy',
    description: 'Open flap root debridement with enamel matrix derivatives for deep infrabony periodontal defects.',
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: 'sv000013-0000-0000-0000-000000000013',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Precision Removable Denture Evaluation',
    description: 'Comprehensive border molding, centric relation recording, and prosthetic stability assessment.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000014-0000-0000-0000-000000000014',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Deep Ultrasonic Periodontal Maintenance',
    description: 'Site-specific subgingival biofilm and calculus removal following active periodontal therapy.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000015-0000-0000-0000-000000000015',
    businessId: 'b0000003-0000-0000-0000-000000000003',
    name: 'Periodontal Preventive Recall Examination',
    description: 'Six-point periodontal pocket depth charting, bleeding-on-probing score, and oral cancer check.',
    durationMinutes: 30,
    isActive: true,
  },

  // --- Radiance Pediatric & Orthodontic Dental (b0000004) ---
  {
    id: 'sv000016-0000-0000-0000-000000000016',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Pediatric Comprehensive Dental Examination & Sealants',
    description: 'Gentle child oral evaluation, low-radiation digital imaging, and resin pit and fissure sealants.',
    durationMinutes: 30,
    isActive: true,
  },
  {
    id: 'sv000017-0000-0000-0000-000000000017',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Clear Aligner Orthodontic Digital Assessment',
    description: 'High-speed intraoral 3D scanning, bite analysis, and simulated smile movement preview.',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'sv000018-0000-0000-0000-000000000018',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Emergency Orthodontic Bracket & Wire Adjustment',
    description: 'Same-day clinical relief for protruding archwires, loose orthodontic bands, and debonded brackets.',
    durationMinutes: 30,
    isActive: true,
  },
  {
    id: 'sv000019-0000-0000-0000-000000000019',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Gentle Child & Teen Hygiene Prophylaxis',
    description: 'Friendly plaque removal, dietary oral health coaching, and remineralizing fluoride foam application.',
    durationMinutes: 30,
    isActive: true,
  },
  {
    id: 'sv000020-0000-0000-0000-000000000020',
    businessId: 'b0000004-0000-0000-0000-000000000004',
    name: 'Enamel Remineralization & Fluoride Therapy',
    description: 'Targeted topical silver diamine fluoride and high-concentration fluoride varnish application.',
    durationMinutes: 30,
    isActive: true,
  },
];
