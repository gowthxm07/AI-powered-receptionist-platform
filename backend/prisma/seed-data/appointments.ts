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
      serviceId: 'sv000004-0000-0000-0000-000000000004',  // Crown (90m)
      startTime: createRelativeDate(baseDate, -2, 14, 0),
      endTime: createRelativeDate(baseDate, -2, 15, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Tooth #19 prep and digital scan completed. Temporary crown placed securely.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00004-0000-0000-0000-000000000004',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000004-0000-0000-0000-000000000004', // Sophia Martinez
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000003-0000-0000-0000-000000000003',  // Whitening (60m)
      startTime: createRelativeDate(baseDate, -1, 11, 0),
      endTime: createRelativeDate(baseDate, -1, 12, 0),
      status: AppointmentStatus.CANCELLED,
      notes: 'Patient called to cancel due to fever. Reschedule pending.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00005-0000-0000-0000-000000000005',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000005-0000-0000-0000-000000000005', // Liam Johnson
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000001-0000-0000-0000-000000000001',  // Exam (30m)
      startTime: createRelativeDate(baseDate, 0, 9, 0),
      endTime: createRelativeDate(baseDate, 0, 9, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Patient checked in via self-service kiosk. Pre-op vitals recorded.',
    },
    {
      id: 'apt00006-0000-0000-0000-000000000006',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000006-0000-0000-0000-000000000006', // Emma Davis
      staffId: 's0000002-0000-0000-0000-000000000002',    // Dr. Emily Chen
      serviceId: 'sv000005-0000-0000-0000-000000000005',  // Pediatric (30m)
      startTime: createRelativeDate(baseDate, 0, 10, 30),
      endTime: createRelativeDate(baseDate, 0, 11, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Parent accompanying 6-year-old child for first dental cleaning and exam.',
    },
    {
      id: 'apt00007-0000-0000-0000-000000000007',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000007-0000-0000-0000-000000000007', // Oliver Brown
      staffId: 's0000003-0000-0000-0000-000000000003',    // Sarah Jenkins, RDH
      serviceId: 'sv000002-0000-0000-0000-000000000002',  // Scaling (45m)
      startTime: createRelativeDate(baseDate, 0, 13, 0),
      endTime: createRelativeDate(baseDate, 0, 13, 45),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Routine 6-month cleaning appointment.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00008-0000-0000-0000-000000000008',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000008-0000-0000-0000-000000000008', // Ava Wilson
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000003-0000-0000-0000-000000000003',  // Whitening (60m)
      startTime: createRelativeDate(baseDate, 1, 14, 0),
      endTime: createRelativeDate(baseDate, 1, 15, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Laser teeth whitening session.',
    },
    {
      id: 'apt00009-0000-0000-0000-000000000009',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000009-0000-0000-0000-000000000009', // James Taylor
      staffId: 's0000001-0000-0000-0000-000000000001',    // Dr. Marcus Thorne
      serviceId: 'sv000004-0000-0000-0000-000000000004',  // Crown (90m)
      startTime: createRelativeDate(baseDate, 2, 9, 30),
      endTime: createRelativeDate(baseDate, 2, 11, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Permanent ceramic crown cementation visit.',
    },
    {
      id: 'apt00010-0000-0000-0000-000000000010',
      businessId: 'b0000001-0000-0000-0000-000000000001',
      customerId: 'c0000010-0000-0000-0000-000000000010', // Charlotte Thomas
      staffId: 's0000002-0000-0000-0000-000000000002',    // Dr. Emily Chen
      serviceId: 'sv000005-0000-0000-0000-000000000005',  // Pediatric (30m)
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
    // BUSINESS 2: Apex Endodontics & Oral Surgery (b0000002) - 11 Appointments
    // Staff:
    //   - Dr. Alistair Sterling (s0000005)
    //   - Dr. Marcus Vance (s0000006)
    //   - Elena Rostova, RDA (s0000007)
    // Services:
    //   - Root Canal (sv000006: 60m), Apicoectomy (sv000007: 90m), Wisdom Tooth (sv000008: 60m), Trauma (sv000009: 45m), Pulpotomy (sv000010: 45m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00012-0000-0000-0000-000000000012',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000015-0000-0000-0000-000000000015', // Benjamin Harris
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Root Canal (60m)
      startTime: createRelativeDate(baseDate, -5, 9, 30),
      endTime: createRelativeDate(baseDate, -5, 10, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Molar #30 microscopic root canal completed. Canals obturated cleanly.',
    },
    {
      id: 'apt00013-0000-0000-0000-000000000013',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000016-0000-0000-0000-000000000016', // Amelia Clark
      staffId: 's0000006-0000-0000-0000-000000000006',    // Dr. Marcus Vance
      serviceId: 'sv000008-0000-0000-0000-000000000008',  // Wisdom Tooth (60m)
      startTime: createRelativeDate(baseDate, -3, 11, 0),
      endTime: createRelativeDate(baseDate, -3, 12, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Impacted lower right wisdom tooth surgical extraction completed with PRF.',
    },
    {
      id: 'apt00014-0000-0000-0000-000000000014',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000017-0000-0000-0000-000000000017', // Henry Lewis
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000010-0000-0000-0000-000000000010',  // Pulpotomy (45m)
      startTime: createRelativeDate(baseDate, -2, 15, 0),
      endTime: createRelativeDate(baseDate, -2, 15, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Emergency coronal pulpotomy and sedative bioceramic dressing placed.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00015-0000-0000-0000-000000000015',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000018-0000-0000-0000-000000000018', // Harper Robinson
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000007-0000-0000-0000-000000000007',  // Apicoectomy (90m)
      startTime: createRelativeDate(baseDate, -1, 14, 0),
      endTime: createRelativeDate(baseDate, -1, 15, 30),
      status: AppointmentStatus.CANCELLED,
      notes: 'Cancelled due to travel conflict. Slot released for urgent surgical triage.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00016-0000-0000-0000-000000000016',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000019-0000-0000-0000-000000000019', // Sebastian Walker
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Root Canal (60m)
      startTime: createRelativeDate(baseDate, 0, 10, 0),
      endTime: createRelativeDate(baseDate, 0, 11, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Deep pulpal inflammation evaluation and microscopic canal cleaning.',
    },
    {
      id: 'apt00017-0000-0000-0000-000000000017',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000020-0000-0000-0000-000000000020', // Evelyn Perez
      staffId: 's0000006-0000-0000-0000-000000000006',    // Dr. Marcus Vance
      serviceId: 'sv000008-0000-0000-0000-000000000008',  // Wisdom Tooth (60m)
      startTime: createRelativeDate(baseDate, 0, 11, 30),
      endTime: createRelativeDate(baseDate, 0, 12, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Bilateral lower third molar surgical consult and panoramic planning.',
    },
    {
      id: 'apt00018-0000-0000-0000-000000000018',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000021-0000-0000-0000-000000000021', // Jack Hall
      staffId: 's0000006-0000-0000-0000-000000000006',    // Dr. Marcus Vance
      serviceId: 'sv000009-0000-0000-0000-000000000009',  // Trauma (45m)
      startTime: createRelativeDate(baseDate, 0, 14, 0),
      endTime: createRelativeDate(baseDate, 0, 14, 45),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Urgent dental trauma stabilization following sports collision.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00019-0000-0000-0000-000000000019',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000022-0000-0000-0000-000000000022', // Abigail Young
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000007-0000-0000-0000-000000000007',  // Apicoectomy (90m)
      startTime: createRelativeDate(baseDate, 1, 14, 30),
      endTime: createRelativeDate(baseDate, 1, 16, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Surgical root-end resection for persistent periapical cyst.',
    },
    {
      id: 'apt00020-0000-0000-0000-000000000020',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000023-0000-0000-0000-000000000023', // Daniel Allen
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000006-0000-0000-0000-000000000006',  // Root Canal (60m)
      startTime: createRelativeDate(baseDate, 2, 10, 0),
      endTime: createRelativeDate(baseDate, 2, 11, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Premolar root canal treatment visit 1.',
    },
    {
      id: 'apt00021-0000-0000-0000-000000000021',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000024-0000-0000-0000-000000000024', // Emily Sanchez
      staffId: 's0000006-0000-0000-0000-000000000006',    // Dr. Marcus Vance
      serviceId: 'sv000008-0000-0000-0000-000000000008',  // Wisdom Tooth (60m)
      startTime: createRelativeDate(baseDate, 4, 13, 0),
      endTime: createRelativeDate(baseDate, 4, 14, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Third molar consultation with cone-beam 3D nerve trace.',
    },
    {
      id: 'apt00022-0000-0000-0000-000000000022',
      businessId: 'b0000002-0000-0000-0000-000000000002',
      customerId: 'c0000025-0000-0000-0000-000000000025', // Matthew Wright
      staffId: 's0000005-0000-0000-0000-000000000005',    // Dr. Alistair Sterling
      serviceId: 'sv000010-0000-0000-0000-000000000010',  // Pulpotomy (45m)
      startTime: createRelativeDate(baseDate, 6, 11, 0),
      endTime: createRelativeDate(baseDate, 6, 11, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Followup vitality check and permanent restorative evaluation.',
    },

    // =========================================================================
    // BUSINESS 3: Zenith Dental Implants & Periodontics (b0000003) - 11 Appointments
    // Staff:
    //   - Dr. Elena Rostova (s0000009)
    //   - Dr. Liam O’Connor (s0000010)
    //   - Nina Kowalski, RDH (s0000011)
    // Services:
    //   - Implant Consult (sv000011: 45m), Flap Therapy (sv000012: 60m), Denture Eval (sv000013: 45m), Periodontal Maint (sv000014: 45m), Recall (sv000015: 30m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00023-0000-0000-0000-000000000023',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000029-0000-0000-0000-000000000029', // David Baker
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Implant Consult (45m)
      startTime: createRelativeDate(baseDate, -6, 10, 0),
      endTime: createRelativeDate(baseDate, -6, 10, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Single posterior implant surgical placement planning completed.',
    },
    {
      id: 'apt00024-0000-0000-0000-000000000024',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000030-0000-0000-0000-000000000030', // Victoria Adams
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000012-0000-0000-0000-000000000012',  // Flap Therapy (60m)
      startTime: createRelativeDate(baseDate, -4, 14, 0),
      endTime: createRelativeDate(baseDate, -4, 15, 0),
      status: AppointmentStatus.COMPLETED,
      notes: 'Periodontal flap debridement and regenerative bone grafting in upper right quadrant.',
    },
    {
      id: 'apt00025-0000-0000-0000-000000000025',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000031-0000-0000-0000-000000000031', // Joseph Nelson
      staffId: 's0000010-0000-0000-0000-000000000010',    // Dr. Liam O’Connor
      serviceId: 'sv000013-0000-0000-0000-000000000013',  // Denture Eval (45m)
      startTime: createRelativeDate(baseDate, -2, 13, 30),
      endTime: createRelativeDate(baseDate, -2, 14, 15),
      status: AppointmentStatus.COMPLETED,
      notes: 'Complete lower precision overdenture border mold and bite registration.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00026-0000-0000-0000-000000000026',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000032-0000-0000-0000-000000000032', // Grace Carter
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Implant Consult (45m)
      startTime: createRelativeDate(baseDate, -1, 16, 0),
      endTime: createRelativeDate(baseDate, -1, 16, 45),
      status: AppointmentStatus.CANCELLED,
      notes: 'Patient rescheduled to next week due to personal travel.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00027-0000-0000-0000-000000000027',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000033-0000-0000-0000-000000000033', // Carter Mitchell
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Implant Consult (45m)
      startTime: createRelativeDate(baseDate, 0, 9, 15),
      endTime: createRelativeDate(baseDate, 0, 10, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: '3D cone-beam computed tomography and bone ridge width evaluation.',
    },
    {
      id: 'apt00028-0000-0000-0000-000000000028',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000034-0000-0000-0000-000000000034', // Chloe Roberts
      staffId: 's0000011-0000-0000-0000-000000000011',    // Nina Kowalski, RDH
      serviceId: 'sv000014-0000-0000-0000-000000000014',  // Periodontal Maint (45m)
      startTime: createRelativeDate(baseDate, 0, 11, 0),
      endTime: createRelativeDate(baseDate, 0, 11, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Three-month periodontal maintenance and irrigation therapy.',
    },
    {
      id: 'apt00029-0000-0000-0000-000000000029',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000035-0000-0000-0000-000000000035', // Owen Turner
      staffId: 's0000010-0000-0000-0000-000000000010',    // Dr. Liam O’Connor
      serviceId: 'sv000013-0000-0000-0000-000000000013',  // Denture Eval (45m)
      startTime: createRelativeDate(baseDate, 0, 14, 30),
      endTime: createRelativeDate(baseDate, 0, 15, 15),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Upper partial denture delivery and occlusion check.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00030-0000-0000-0000-000000000030',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000036-0000-0000-0000-000000000036', // Penelope Phillips
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000011-0000-0000-0000-000000000011',  // Implant Consult (45m)
      startTime: createRelativeDate(baseDate, 1, 10, 0),
      endTime: createRelativeDate(baseDate, 1, 10, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'All-on-4 dental implant rehabilitation consultation.',
    },
    {
      id: 'apt00031-0000-0000-0000-000000000031',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000037-0000-0000-0000-000000000037', // Wyatt Campbell
      staffId: 's0000009-0000-0000-0000-000000000009',    // Dr. Elena Rostova
      serviceId: 'sv000012-0000-0000-0000-000000000012',  // Flap Therapy (60m)
      startTime: createRelativeDate(baseDate, 2, 13, 0),
      endTime: createRelativeDate(baseDate, 2, 14, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Lower anterior periodontal regenerative surgery.',
    },
    {
      id: 'apt00032-0000-0000-0000-000000000032',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000038-0000-0000-0000-000000000038', // Layla Parker
      staffId: 's0000010-0000-0000-0000-000000000010',    // Dr. Liam O’Connor
      serviceId: 'sv000015-0000-0000-0000-000000000015',  // Recall (30m)
      startTime: createRelativeDate(baseDate, 4, 15, 0),
      endTime: createRelativeDate(baseDate, 4, 15, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Annual implant stability recall check with Periotest.',
    },
    {
      id: 'apt00033-0000-0000-0000-000000000033',
      businessId: 'b0000003-0000-0000-0000-000000000003',
      customerId: 'c0000039-0000-0000-0000-000000000039', // Gabriel Evans
      staffId: 's0000011-0000-0000-0000-000000000011',    // Nina Kowalski, RDH
      serviceId: 'sv000014-0000-0000-0000-000000000014',  // Periodontal Maint (45m)
      startTime: createRelativeDate(baseDate, 7, 11, 0),
      endTime: createRelativeDate(baseDate, 7, 11, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Routine deep biofilm debridement.',
    },

    // =========================================================================
    // BUSINESS 4: Radiance Pediatric & Orthodontic Dental (b0000004) - 11 Appointments
    // Staff:
    //   - Dr. Maya Lin (s0000013)
    //   - Dr. Jordan Lee (s0000014)
    //   - Chloe Bennett, RDH (s0000015)
    // Services:
    //   - Pediatric Exam (sv000016: 30m), Aligner Assess (sv000017: 45m), Ortho Repair (sv000018: 30m), Child Hygiene (sv000019: 30m), Fluoride (sv000020: 30m)
    // =========================================================================

    // --- Past Completed Appointments ---
    {
      id: 'apt00034-0000-0000-0000-000000000034',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000043-0000-0000-0000-000000000043', // Levi Sanchez
      staffId: 's0000013-0000-0000-0000-000000000013',    // Dr. Maya Lin
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Pediatric Exam (30m)
      startTime: createRelativeDate(baseDate, -5, 11, 0),
      endTime: createRelativeDate(baseDate, -5, 11, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Primary dentition checkup and molar sealant placement completed.',
    },
    {
      id: 'apt00035-0000-0000-0000-000000000035',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000044-0000-0000-0000-000000000044', // Hazel Morris
      staffId: 's0000014-0000-0000-0000-000000000014',    // Dr. Jordan Lee
      serviceId: 'sv000017-0000-0000-0000-000000000017',  // Aligner Assess (45m)
      startTime: createRelativeDate(baseDate, -3, 13, 0),
      endTime: createRelativeDate(baseDate, -3, 13, 45),
      status: AppointmentStatus.COMPLETED,
      notes: 'Intraoral optical 3D scan and simulated clear aligner progression.',
    },
    {
      id: 'apt00036-0000-0000-0000-000000000036',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000045-0000-0000-0000-000000000045', // Isaac Rogers
      staffId: 's0000014-0000-0000-0000-000000000014',    // Dr. Jordan Lee
      serviceId: 'sv000018-0000-0000-0000-000000000018',  // Ortho Repair (30m)
      startTime: createRelativeDate(baseDate, -2, 15, 0),
      endTime: createRelativeDate(baseDate, -2, 15, 30),
      status: AppointmentStatus.COMPLETED,
      notes: 'Emergency rebonding of debonded bracket on upper left canine.',
    },

    // --- Past Cancelled Appointment ---
    {
      id: 'apt00037-0000-0000-0000-000000000037',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000046-0000-0000-0000-000000000046', // Aurora Reed
      staffId: 's0000013-0000-0000-0000-000000000013',    // Dr. Maya Lin
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Pediatric Exam (30m)
      startTime: createRelativeDate(baseDate, -1, 10, 0),
      endTime: createRelativeDate(baseDate, -1, 10, 30),
      status: AppointmentStatus.CANCELLED,
      notes: 'Parent called to reschedule child visit due to school schedule.',
    },

    // --- TODAY'S Active Appointments (Day 0) ---
    {
      id: 'apt00038-0000-0000-0000-000000000038',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000047-0000-0000-0000-000000000047', // Christopher Cook
      staffId: 's0000013-0000-0000-0000-000000000013',    // Dr. Maya Lin
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Pediatric Exam (30m)
      startTime: createRelativeDate(baseDate, 0, 10, 0),
      endTime: createRelativeDate(baseDate, 0, 10, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Routine 6-month child dental milestone check and bite analysis.',
    },
    {
      id: 'apt00039-0000-0000-0000-000000000039',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000048-0000-0000-0000-000000000048', // Savannah Morgan
      staffId: 's0000014-0000-0000-0000-000000000014',    // Dr. Jordan Lee
      serviceId: 'sv000017-0000-0000-0000-000000000017',  // Aligner Assess (45m)
      startTime: createRelativeDate(baseDate, 0, 13, 0),
      endTime: createRelativeDate(baseDate, 0, 13, 45),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Teen clear aligner tracking evaluation and stage 4 delivery.',
    },
    {
      id: 'apt00040-0000-0000-0000-000000000040',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000049-0000-0000-0000-000000000049', // Andrew Bell
      staffId: 's0000015-0000-0000-0000-000000000015',    // Chloe Bennett, RDH
      serviceId: 'sv000019-0000-0000-0000-000000000019',  // Child Hygiene (30m)
      startTime: createRelativeDate(baseDate, 0, 15, 30),
      endTime: createRelativeDate(baseDate, 0, 16, 0),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Gentle pediatric prophylaxis and friendly brushing coaching.',
    },

    // --- Future Appointments ---
    {
      id: 'apt00041-0000-0000-0000-000000000041',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000050-0000-0000-0000-000000000050', // Brooklyn Murphy
      staffId: 's0000013-0000-0000-0000-000000000013',    // Dr. Maya Lin
      serviceId: 'sv000020-0000-0000-0000-000000000020',  // Fluoride (30m)
      startTime: createRelativeDate(baseDate, 1, 11, 0),
      endTime: createRelativeDate(baseDate, 1, 11, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'High-concentration remineralizing fluoride varnish application.',
    },
    {
      id: 'apt00042-0000-0000-0000-000000000042',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000051-0000-0000-0000-000000000051', // Thomas Bailey
      staffId: 's0000014-0000-0000-0000-000000000014',    // Dr. Jordan Lee
      serviceId: 'sv000018-0000-0000-0000-000000000018',  // Ortho Repair (30m)
      startTime: createRelativeDate(baseDate, 2, 14, 0),
      endTime: createRelativeDate(baseDate, 2, 14, 30),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Protruding orthodontic archwire trimming visit.',
    },
    {
      id: 'apt00043-0000-0000-0000-000000000043',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000052-0000-0000-0000-000000000052', // Claire Rivera
      staffId: 's0000015-0000-0000-0000-000000000015',    // Chloe Bennett, RDH
      serviceId: 'sv000019-0000-0000-0000-000000000019',  // Child Hygiene (30m)
      startTime: createRelativeDate(baseDate, 3, 10, 30),
      endTime: createRelativeDate(baseDate, 3, 11, 0),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Child routine cleaning and plaque assessment.',
    },
    {
      id: 'apt00044-0000-0000-0000-000000000044',
      businessId: 'b0000004-0000-0000-0000-000000000004',
      customerId: 'c0000053-0000-0000-0000-000000000053', // Joshua Cooper
      staffId: 's0000013-0000-0000-0000-000000000013',    // Dr. Maya Lin
      serviceId: 'sv000016-0000-0000-0000-000000000016',  // Pediatric Exam (30m)
      startTime: createRelativeDate(baseDate, 5, 16, 0),
      endTime: createRelativeDate(baseDate, 5, 16, 30),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Pre-kindergarten dental clearance examination.',
    },
  ];
}
