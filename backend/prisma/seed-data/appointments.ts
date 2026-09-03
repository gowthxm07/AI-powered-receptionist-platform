import { AppointmentStatus } from '@prisma/client';

export interface DemoAppointmentData {
  id: string;
  businessId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes?: string;
}

/**
 * Builds deterministic dates relative to an execution base date.
 * Year, Month, Day are offset by `dayOffset`, with exact hours and minutes specified in UTC.
 */
function createRelativeDate(baseDate: Date, dayOffset: number, hoursUtc: number, minutesUtc: number): Date {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hoursUtc, minutesUtc, 0, 0);
  return d;
}

export function getDemoAppointments(baseDate: Date = new Date()): DemoAppointmentData[] {
  return [
    // =========================================================================
    // BUSINESS 1: Lumina Dental Care (b0000001) - 11 Appointments
    // Staff:
    //   - Dr. Marcus Thorne (s0000001)
    //   - Dr. Emily Chen (s0000002)
    //   - Sarah Jenkins, RDH (s0000003)
    // Services:
    //   - Exam (sv000001: 30m), Scaling (sv000002: 45m), Whitening (sv000003: 60m), Crown (sv000004: 90m), Pediatric (sv000005: 30m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00001-0000-0000-0000-000000000001',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000001-0000-0000-0000-000000000001', // Rahul Sharma
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000001-0000-0000-0000-000000000001',  // Exam (30m)
      startTime: createRelativeDate(baseDate, -4, 9, 0),
      endTime: createRelativeDate(baseDate, -4, 9, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Routine checkup completed. Patient advised on flossing technique. Scheduled cleaning.',
    },
    {
      id: 'apt00002-0000-0000-0000-000000000002',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000002-0000-0000-0000-000000000002', // Priya Patel
      staffId: 's0000003-0000-0000-0000-000000000003',    // Sarah Jenkins, RDH
      serviceId: 'sv000002-0000-0000-0000-000000000002',  // Scaling (45m)
      startTime: createRelativeDate(baseDate, -3, 10, 0),
      endTime: createRelativeDate(baseDate, -3, 10, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Full ultrasonic scaling and airflow polishing completed with zero sensitivity.',
    },
    {
      id: 'apt00003-0000-0000-0000-000000000003',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000003-0000-0000-0000-000000000003', // Alexander Wright
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000004-0000-0000-0000-000000000004',  // Crown Prep (90m)
      startTime: createRelativeDate(baseDate, -2, 14, 0),
      endTime: createRelativeDate(baseDate, -2, 15, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Precision 3D optical scan sent to dental lab. Temporary ceramic crown fitted.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00004-0000-0000-0000-000000000004',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000004-0000-0000-0000-000000000004', // Sophia Martinez
      staffId: 's0000002-0000-0000-0000-000000000002',    // Dr. Emily Chen
      serviceId: 'sv000005-0000-0000-0000-000000000005',  // Pediatric (30m)
      startTime: createRelativeDate(baseDate, -1, 11, 0),
      endTime: createRelativeDate(baseDate, -1, 11, 30),
      status: AppointmentStatus.CANCELLED,
      notes: 'Caller cancelled due to school schedule conflict. Requested reschedule next week.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00005-0000-0000-0000-000000000005',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000005-0000-0000-0000-000000000005', // Liam Johnson
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000003-0000-0000-0000-000000000003',  // Whitening (60m)
      startTime: createRelativeDate(baseDate, 0, 9, 30),
      endTime: createRelativeDate(baseDate, 0, 10, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Morning session. Client requested low-sensitivity bleaching gel.',
    },
    {
      id: 'apt00006-0000-0000-0000-000000000006',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000006-0000-0000-0000-000000000006', // Emma Davis
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne (Back-to-back!)
      serviceId: 'sv000001-0000-0000-0000-000000000001',  // Exam (30m)
      startTime: createRelativeDate(baseDate, 0, 10, 30),
      endTime: createRelativeDate(baseDate, 0, 11, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'New patient intake examination. Paperwork pre-completed online.',
    },
    {
      id: 'apt00007-0000-0000-0000-000000000007',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000007-0000-0000-0000-000000000007', // Oliver Brown
      staffId: 's0000002-0000-0000-0000-000000000002',    // Dr. Emily Chen
      serviceId: 'sv000005-0000-0000-0000-000000000005',  // Pediatric (30m)
      startTime: createRelativeDate(baseDate, 0, 14, 0),
      endTime: createRelativeDate(baseDate, 0, 14, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Pediatric fluoride varnish and 6-month checkup.',
    },

    // --- Future Appointments (Tomorrow & Next Week) ---
    {
      id: 'apt00008-0000-0000-0000-000000000008',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000008-0000-0000-0000-000000000008', // Ava Wilson
      staffId: 's0000003-0000-0000-0000-000000000003',    // Sarah Jenkins, RDH
      serviceId: 'sv000002-0000-0000-0000-000000000002',  // Scaling (45m)
      startTime: createRelativeDate(baseDate, 1, 10, 0),
      endTime: createRelativeDate(baseDate, 1, 10, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Regular 6-month preventive hygiene cleaning.',
    },
    {
      id: 'apt00009-0000-0000-0000-000000000009',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000009-0000-0000-0000-000000000009', // Lucas Garcia
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000004-0000-0000-0000-000000000004',  // Crown (90m)
      startTime: createRelativeDate(baseDate, 2, 13, 0),
      endTime: createRelativeDate(baseDate, 2, 14, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Final ceramic crown cementation and occlusion adjustment.',
    },
    {
      id: 'apt00010-0000-0000-0000-000000000010',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000010-0000-0000-0000-000000000010', // Mia Taylor
      staffId: 's0000002-0000-0000-0000-000000000002',    // Dr. Emily Chen
      serviceId: 'sv000001-0000-0000-0000-000000000001',  // Exam (30m)
      startTime: createRelativeDate(baseDate, 3, 11, 0),
      endTime: createRelativeDate(baseDate, 3, 11, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Orthodontic retainer check and alignment evaluation.',
    },
    {
      id: 'apt00011-0000-0000-0000-000000000011',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000011-0000-0000-0000-000000000011', // Noah Anderson
      staffId: 's0000003-0000-0000-0000-000000000003',    // Sarah Jenkins, RDH
      serviceId: 'sv000002-0000-0000-0000-000000000002',  // Scaling (45m)
      startTime: createRelativeDate(baseDate, 5, 15, 0),
      endTime: createRelativeDate(baseDate, 5, 15, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Late afternoon deep periodontal maintenance.',
    },

    // =========================================================================
    // BUSINESS 2: Radiance Dermatology & Aesthetics (b0000002) - 11 Appointments
    // Staff:
    //   - Dr. Alistair Sterling (s0000005)
    //   - Nurse Jessica Bailey, NP (s0000006)
    //   - Chloe Bennett (s0000007)
    // Services:
    //   - Skin Check (sv000006: 30m), HydraFacial (sv000007: 60m), Laser (sv000008: 45m), Peel (sv000009: 45m), Injectables (sv000010: 60m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00012-0000-0000-0000-000000000012',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000015-0000-0000-0000-000000000015', // Benjamin Harris
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Mole Check (30m)
      startTime: createRelativeDate(baseDate, -5, 9, 30),
      endTime: createRelativeDate(baseDate, -5, 10, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Full body dermoscopy normal. Recommended annual surveillance.',
    },
    {
      id: 'apt00013-0000-0000-0000-000000000013',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000016-0000-0000-0000-000000000016', // Amelia Clark
      staffId: 's0000007-0000-0000-0000-000000000007',    // Chloe Bennett
      serviceId: 'sv000007-0000-0000-0000-000000000007',  // HydraFacial (60m)
      startTime: createRelativeDate(baseDate, -3, 11, 0),
      endTime: createRelativeDate(baseDate, -3, 12, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Infused hyaluronic peptide boosters. Skin radiant with minimal redness.',
    },
    {
      id: 'apt00014-0000-0000-0000-000000000014',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000017-0000-0000-0000-000000000017', // Henry Lewis
      staffId: 's0000006-0000-0000-0000-000000000006',    // Nurse Jessica Bailey
      serviceId: 'sv000010-0000-0000-0000-000000000010',  // Injectables (60m)
      startTime: createRelativeDate(baseDate, -2, 15, 0),
      endTime: createRelativeDate(baseDate, -2, 16, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Glabellar and forehead neuromodulator treatment. Followup in 2 weeks.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00015-0000-0000-0000-000000000015',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000018-0000-0000-0000-000000000018', // Harper Robinson
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000008-0000-0000-0000-000000000008',  // Laser Consult (45m)
      startTime: createRelativeDate(baseDate, -1, 14, 0),
      endTime: createRelativeDate(baseDate, -1, 14, 45),
      status: AppointmentStatus.CANCELLED,
      notes: 'Cancelled due to travel conflict. Slot released for emergency triage.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00016-0000-0000-0000-000000000016',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000019-0000-0000-0000-000000000019', // Sebastian Walker
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Mole Check (30m)
      startTime: createRelativeDate(baseDate, 0, 10, 0),
      endTime: createRelativeDate(baseDate, 0, 10, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Full body screening requested before summer outdoor trip.',
    },
    {
      id: 'apt00017-0000-0000-0000-000000000017',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000020-0000-0000-0000-000000000020', // Evelyn Perez
      staffId: 's0000007-0000-0000-0000-000000000007',    // Chloe Bennett
      serviceId: 'sv000007-0000-0000-0000-000000000007',  // HydraFacial (60m)
      startTime: createRelativeDate(baseDate, 0, 11, 30),
      endTime: createRelativeDate(baseDate, 0, 12, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'First time facial appointment. Sensitive skin formulation selected.',
    },
    {
      id: 'apt00018-0000-0000-0000-000000000018',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000021-0000-0000-0000-000000000021', // Jack Hall
      staffId: 's0000006-0000-0000-0000-000000000006',    // Nurse Jessica Bailey
      serviceId: 'sv000009-0000-0000-0000-000000000009',  // Chemical Peel (45m)
      startTime: createRelativeDate(baseDate, 0, 14, 0),
      endTime: createRelativeDate(baseDate, 0, 14, 45),
      status: AppointmentStatus.CONFIRMED,
      notes: 'TCA superficial peel protocol. SPF 50 sunscreen prepped.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00019-0000-0000-0000-000000000019',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000022-0000-0000-0000-000000000022', // Abigail Young
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000008-0000-0000-0000-000000000008',  // Laser Consult (45m)
      startTime: createRelativeDate(baseDate, 1, 14, 30),
      endTime: createRelativeDate(baseDate, 1, 15, 15),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Assessment for acne scar laser revision.',
    },
    {
      id: 'apt00020-0000-0000-0000-000000000020',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000023-0000-0000-0000-000000000023', // Daniel Allen
      staffId: 's0000006-0000-0000-0000-000000000006',    // Nurse Jessica Bailey
      serviceId: 'sv000010-0000-0000-0000-000000000010',  // Injectables (60m)
      startTime: createRelativeDate(baseDate, 2, 10, 0),
      endTime: createRelativeDate(baseDate, 2, 11, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Annual touchup appointment.',
    },
    {
      id: 'apt00021-0000-0000-0000-000000000021',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000024-0000-0000-0000-000000000024', // Emily Sanchez
      staffId: 's0000007-0000-0000-0000-000000000007',    // Chloe Bennett
      serviceId: 'sv000007-0000-0000-0000-000000000007',  // HydraFacial (60m)
      startTime: createRelativeDate(baseDate, 4, 13, 0),
      endTime: createRelativeDate(baseDate, 4, 14, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Pre-wedding skin prep session.',
    },
    {
      id: 'apt00022-0000-0000-0000-000000000022',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000025-0000-0000-0000-000000000025', // Matthew Wright
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Mole Check (30m)
      startTime: createRelativeDate(baseDate, 6, 11, 0),
      endTime: createRelativeDate(baseDate, 6, 11, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Followup biopsy result consultation.',
    },

    // =========================================================================
    // BUSINESS 3: Apex Strategy & Financial Advisory (b0000003) - 11 Appointments
    // Staff:
    //   - Marcus Vance (s0000009)
    //   - Victoria Sinclair (s0000010)
    //   - Jonathan Reed (s0000011)
    // Services:
    //   - Diagnostic (sv000011: 45m), Growth (sv000012: 60m), Tax (sv000013: 90m), M&A (sv000014: 90m), Leadership (sv000015: 60m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00023-0000-0000-0000-000000000023',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000029-0000-0000-0000-000000000029', // David Baker
      staffId: 's0000009-0000-0000-0000-000000000009',    // Marcus Vance
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Diagnostic (45m)
      startTime: createRelativeDate(baseDate, -6, 10, 0),
      endTime: createRelativeDate(baseDate, -6, 10, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Initial operational review concluded. Growth roadmap delivered to board.',
    },
    {
      id: 'apt00024-0000-0000-0000-000000000024',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000030-0000-0000-0000-000000000030', // Victoria Adams
      staffId: 's0000010-0000-0000-0000-000000000010',    // Victoria Sinclair
      serviceId: 'sv000012-0000-0000-0000-000000000012',  // Growth (60m)
      startTime: createRelativeDate(baseDate, -4, 14, 0),
      endTime: createRelativeDate(baseDate, -4, 15, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Series B capital allocation strategy aligned with finance committee.',
    },
    {
      id: 'apt00025-0000-0000-0000-000000000025',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000031-0000-0000-0000-000000000031', // Joseph Nelson
      staffId: 's0000011-0000-0000-0000-000000000011',    // Jonathan Reed
      serviceId: 'sv000014-0000-0000-0000-000000000014',  // M&A (90m)
      startTime: createRelativeDate(baseDate, -2, 13, 30),
      endTime: createRelativeDate(baseDate, -2, 15, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Buy-side acquisition target due diligence synthesis completed.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00026-0000-0000-0000-000000000026',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000032-0000-0000-0000-000000000032', // Grace Carter
      staffId: 's0000009-0000-0000-0000-000000000009',    // Marcus Vance
      serviceId: 'sv000015-0000-0000-0000-000000000015',  // Leadership (60m)
      startTime: createRelativeDate(baseDate, -1, 16, 0),
      endTime: createRelativeDate(baseDate, -1, 17, 0),
      status: AppointmentStatus.CANCELLED,
      notes: 'Board meeting overrun prompted client cancellation.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00027-0000-0000-0000-000000000027',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000033-0000-0000-0000-000000000033', // Carter Mitchell
      staffId: 's0000009-0000-0000-0000-000000000009',    // Marcus Vance
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Diagnostic (45m)
      startTime: createRelativeDate(baseDate, 0, 9, 15),
      endTime: createRelativeDate(baseDate, 0, 10, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Executive briefing regarding Q4 international expansion.',
    },
    {
      id: 'apt00028-0000-0000-0000-000000000028',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000034-0000-0000-0000-000000000034', // Chloe Roberts
      staffId: 's0000010-0000-0000-0000-000000000010',    // Victoria Sinclair
      serviceId: 'sv000012-0000-0000-0000-000000000012',  // Growth (60m)
      startTime: createRelativeDate(baseDate, 0, 11, 0),
      endTime: createRelativeDate(baseDate, 0, 12, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Mid-stage startup restructuring and team scaling review.',
    },
    {
      id: 'apt00029-0000-0000-0000-000000000029',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000035-0000-0000-0000-000000000035', // Owen Turner
      staffId: 's0000011-0000-0000-0000-000000000011',    // Jonathan Reed
      serviceId: 'sv000014-0000-0000-0000-000000000014',  // M&A (90m)
      startTime: createRelativeDate(baseDate, 0, 14, 30),
      endTime: createRelativeDate(baseDate, 0, 16, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Confidential valuation modeling presentation for private equity partners.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00030-0000-0000-0000-000000000030',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000036-0000-0000-0000-000000000036', // Penelope Phillips
      staffId: 's0000009-0000-0000-0000-000000000009',    // Marcus Vance
      serviceId: 'sv000015-0000-0000-0000-000000000015',  // Leadership (60m)
      startTime: createRelativeDate(baseDate, 1, 10, 0),
      endTime: createRelativeDate(baseDate, 1, 11, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'CEO one-on-one advisory session.',
    },
    {
      id: 'apt00031-0000-0000-0000-000000000031',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000037-0000-0000-0000-000000000037', // Wyatt Campbell
      staffId: 's0000010-0000-0000-0000-000000000010',    // Victoria Sinclair
      serviceId: 'sv000013-0000-0000-0000-000000000013',  // Tax (90m)
      startTime: createRelativeDate(baseDate, 2, 13, 0),
      endTime: createRelativeDate(baseDate, 2, 14, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Cross-border tax structure optimization.',
    },
    {
      id: 'apt00032-0000-0000-0000-000000000032',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000038-0000-0000-0000-000000000038', // Layla Parker
      staffId: 's0000011-0000-0000-0000-000000000011',    // Jonathan Reed
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Diagnostic (45m)
      startTime: createRelativeDate(baseDate, 4, 15, 0),
      endTime: createRelativeDate(baseDate, 4, 15, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'New venture assessment.',
    },
    {
      id: 'apt00033-0000-0000-0000-000000000033',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000039-0000-0000-0000-000000000039', // Gabriel Evans
      staffId: 's0000009-0000-0000-0000-000000000009',    // Marcus Vance
      serviceId: 'sv000012-0000-0000-0000-000000000012',  // Growth (60m)
      startTime: createRelativeDate(baseDate, 7, 11, 0),
      endTime: createRelativeDate(baseDate, 7, 12, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Strategic board review.',
    },

    // =========================================================================
    // BUSINESS 4: Zenith Luxury Hair & Spa Studio (b0000004) - 11 Appointments
    // Staff:
    //   - Elena Rostova (s0000013)
    //   - Antoine Laurent (s0000014)
    //   - Maya Lin (s0000015)
    // Services:
    //   - Haircut (sv000016: 45m), Balayage (sv000017: 90m), Scalp Spa (sv000018: 60m), Keratin (sv000019: 90m), Beard (sv000020: 30m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00034-0000-0000-0000-000000000034',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000043-0000-0000-0000-000000000043', // Levi Sanchez
      staffId: 's0000013-0000-0000-0000-000000000013',    // Elena Rostova
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Haircut (45m)
      startTime: createRelativeDate(baseDate, -5, 11, 0),
      endTime: createRelativeDate(baseDate, -5, 11, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Layered texture styling and botanical rinse.',
    },
    {
      id: 'apt00035-0000-0000-0000-000000000035',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000044-0000-0000-0000-000000000044', // Hazel Morris
      staffId: 's0000014-0000-0000-0000-000000000014',    // Antoine Laurent
      serviceId: 'sv000017-0000-0000-0000-000000000017',  // Balayage (90m)
      startTime: createRelativeDate(baseDate, -3, 13, 0),
      endTime: createRelativeDate(baseDate, -3, 14, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Sunlight caramel balayage with glaze treatment.',
    },
    {
      id: 'apt00036-0000-0000-0000-000000000036',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000045-0000-0000-0000-000000000045', // Isaac Rogers
      staffId: 's0000015-0000-0000-0000-000000000015',    // Maya Lin
      serviceId: 'sv000018-0000-0000-0000-000000000018',  // Scalp Spa (60m)
      startTime: createRelativeDate(baseDate, -2, 15, 0),
      endTime: createRelativeDate(baseDate, -2, 16, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Japanese pressure point massage and tea tree steam.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00037-0000-0000-0000-000000000037',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000046-0000-0000-0000-000000000046', // Aurora Reed
      staffId: 's0000013-0000-0000-0000-000000000013',    // Elena Rostova
      serviceId: 'sv000019-0000-0000-0000-000000000019',  // Keratin (90m)
      startTime: createRelativeDate(baseDate, -1, 10, 0),
      endTime: createRelativeDate(baseDate, -1, 11, 30),
      status: AppointmentStatus.CANCELLED,
      notes: 'Client rescheduled due to illness.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00038-0000-0000-0000-000000000038',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000047-0000-0000-0000-000000000047', // Christopher Cook
      staffId: 's0000013-0000-0000-0000-000000000013',    // Elena Rostova
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Haircut (45m)
      startTime: createRelativeDate(baseDate, 0, 10, 0),
      endTime: createRelativeDate(baseDate, 0, 10, 45),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Editorial styled finish requested for photography event.',
    },
    {
      id: 'apt00039-0000-0000-0000-000000000039',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000048-0000-0000-0000-000000000048', // Savannah Morgan
      staffId: 's0000014-0000-0000-0000-000000000014',    // Antoine Laurent
      serviceId: 'sv000017-0000-0000-0000-000000000017',  // Balayage (90m)
      startTime: createRelativeDate(baseDate, 0, 13, 0),
      endTime: createRelativeDate(baseDate, 0, 14, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Full multi-dimensional blonde gloss refinement.',
    },
    {
      id: 'apt00040-0000-0000-0000-000000000040',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000049-0000-0000-0000-000000000049', // Andrew Bell
      staffId: 's0000015-0000-0000-0000-000000000015',    // Maya Lin
      serviceId: 'sv000018-0000-0000-0000-000000000018',  // Scalp Spa (60m)
      startTime: createRelativeDate(baseDate, 0, 15, 30),
      endTime: createRelativeDate(baseDate, 0, 16, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Aromatherapy lavender infusion package.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00041-0000-0000-0000-000000000041',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000050-0000-0000-0000-000000000050', // Brooklyn Murphy
      staffId: 's0000013-0000-0000-0000-000000000013',    // Elena Rostova
      serviceId: 'sv000019-0000-0000-0000-000000000019',  // Keratin (90m)
      startTime: createRelativeDate(baseDate, 1, 11, 0),
      endTime: createRelativeDate(baseDate, 1, 12, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Smoothing treatment for natural curly hair.',
    },
    {
      id: 'apt00042-0000-0000-0000-000000000042',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000051-0000-0000-0000-000000000051', // Thomas Bailey
      staffId: 's0000014-0000-0000-0000-000000000014',    // Antoine Laurent
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Haircut (45m)
      startTime: createRelativeDate(baseDate, 2, 14, 0),
      endTime: createRelativeDate(baseDate, 2, 14, 45),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Regular scissor cut maintenance.',
    },
    {
      id: 'apt00043-0000-0000-0000-000000000043',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000052-0000-0000-0000-000000000052', // Claire Rivera
      staffId: 's0000015-0000-0000-0000-000000000015',    // Maya Lin
      serviceId: 'sv000018-0000-0000-0000-000000000018',  // Scalp Spa (60m)
      startTime: createRelativeDate(baseDate, 3, 10, 30),
      endTime: createRelativeDate(baseDate, 3, 11, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Relaxation package booking.',
    },
    {
      id: 'apt00044-0000-0000-0000-000000000044',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000053-0000-0000-0000-000000000053', // Joshua Cooper
      staffId: 's0000013-0000-0000-0000-000000000013',    // Elena Rostova
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Haircut (45m)
      startTime: createRelativeDate(baseDate, 5, 16, 0),
      endTime: createRelativeDate(baseDate, 5, 16, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Evening styling slot.',
    },
  ];
}
