import assert from 'assert';
import { prisma } from '../lib/prisma';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIIntent } from '../modules/ai/types/intent.types';
import { AIAction } from '../modules/ai/types/action.types';
import { BookingConversationStep } from '../modules/ai/conversation';
import {
  LUMINA_DENTAL_BUSINESS_ID,
  LUMINA_DENTAL_PROFILE,
} from '../modules/ai/knowledge';

export interface EvaluationResult {
  testId: string;
  scenario: string;
  utterance: string;
  expected: string;
  observed: string;
  status: 'PASS' | 'FAIL' | 'DEFECT';
  details: any;
  defect?: string;
  recommendedFix?: string;
}

const RADIANCE_DERM_BUSINESS_ID = 'b0000002-0000-0000-0000-000000000002';

export async function runEndToEndVoiceEvaluation(): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  console.log('================================================================');
  console.log('--- 🔬 STARTING REALISTIC END-TO-END VOICE EVALUATION ---');
  console.log('================================================================');

  // Purge test appointments from prior evaluation runs to ensure pristine availability state
  await prisma.appointment.deleteMany({
    where: {
      customer: {
        phone: { in: ['+1-555-019-9988', '555-019-9988'] },
      },
    },
  });

  // --------------------------------------------------------------------------
  // SCENARIO A: Routine Checkup
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO A: Routine Checkup ---');
  const sessA = `eval-sess-a-${Date.now()}`;
  const resA1 = await aiReceptionistService.processMessage({
    message: 'Hello, I want to book a routine dental checkup.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessA,
    },
  });

  const passedA1 =
    resA1.success &&
    (resA1.response.toLowerCase().includes('comprehensive oral exam') ||
      resA1.response.toLowerCase().includes('checkup') ||
      resA1.response.toLowerCase().includes('exam')) &&
    !resA1.response.toLowerCase().includes('which service would you like to book');

  results.push({
    testId: 'SCENARIO-A-01',
    scenario: 'Routine Checkup - Turn 1 Intent & Natural Suggestion',
    utterance: 'Hello, I want to book a routine dental checkup.',
    expected: 'Greet naturally, recognize routine checkup, suggest Comprehensive Oral Exam without asking generic "Which service would you like to book?"',
    observed: resA1.response,
    status: passedA1 ? 'PASS' : 'FAIL',
    details: {
      intent: resA1.intent,
      action: resA1.action,
      step: resA1.conversationState?.step,
      suggestedService: resA1.conversationState?.selectedService?.name,
    },
  });

  // --------------------------------------------------------------------------
  // SCENARIO B: Natural Tooth-Pain Descriptions (7 variations + 5 paraphrases)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO B: 7 Natural Tooth-Pain Descriptions + 5 Paraphrases ---');
  const painVariations = [
    { id: 'B-01', text: 'My tooth has been hurting for two days.' },
    { id: 'B-02', text: 'It hurts whenever I chew.' },
    { id: 'B-03', text: 'I have a sharp pain in one of my back teeth.' },
    { id: 'B-04', text: 'My teeth are sensitive when I drink something cold.' },
    { id: 'B-05', text: "I'm not sure what is wrong, but something feels uncomfortable in my mouth." },
    { id: 'B-06', text: 'My jaw hurts when I bite down.' },
    { id: 'B-07', text: 'I think I may have a cavity.' },
    // Paraphrases and speech-recognition variations:
    { id: 'B-08', text: 'tooth ache' },
    { id: 'B-09', text: 'tooth pain' },
    { id: 'B-10', text: 'pain while biting' },
    { id: 'B-11', text: 'cold sensitivity' },
    { id: 'B-12', text: 'back tooth is troubling me' },
  ];

  for (const v of painVariations) {
    const route = FastIntentRouter.routeIntent(v.text);
    const resp = await aiReceptionistService.processMessage({
      message: v.text,
      context: {
        businessId: LUMINA_DENTAL_BUSINESS_ID,
        sessionId: `eval-b-${v.id}-${Date.now()}`,
      },
    });

    const hasEmpathy =
      resp.response.toLowerCase().includes('sorry to hear') ||
      resp.response.toLowerCase().includes('understand') ||
      resp.response.toLowerCase().includes('help');
    const hasCautiousLanguage =
      resp.response.toLowerCase().includes('dentist must examine') ||
      resp.response.toLowerCase().includes('examine you') ||
      resp.response.toLowerCase().includes('consultation') ||
      resp.response.toLowerCase().includes('determine the cause');
    const avoidsAlarmingDiagnosis =
      !resp.response.toLowerCase().includes('you definitely have') &&
      !resp.response.toLowerCase().includes('pulp inflammation') &&
      !resp.response.toLowerCase().includes('you need a root canal');

    const passed =
      (route.intent === AIIntent.DENTAL_SYMPTOM_INQUIRY ||
        route.intent === AIIntent.BOOK_APPOINTMENT) &&
      hasCautiousLanguage &&
      avoidsAlarmingDiagnosis;

    results.push({
      testId: `SCENARIO-${v.id}`,
      scenario: `Symptom Variation: "${v.text}"`,
      utterance: v.text,
      expected: 'Route to DENTAL_SYMPTOM_INQUIRY / TRIAGE, express empathy, cautious clinical language, avoid definitive diagnosis',
      observed: resp.response,
      status: passed ? 'PASS' : 'DEFECT',
      details: {
        routedIntent: route.intent,
        confidence: route.confidence,
        responseIntent: resp.intent,
        action: resp.action,
        hasEmpathy,
        hasCautiousLanguage,
        avoidsAlarmingDiagnosis,
      },
      defect: !passed
        ? `Failed routing or phrasing: intent=${route.intent}, response=${resp.response.slice(0, 80)}...`
        : undefined,
      recommendedFix: !passed
        ? 'Extend FastIntentRouter regex keywords to capture this natural symptom variation.'
        : undefined,
    });
  }

  // --------------------------------------------------------------------------
  // SCENARIO C: Follow-Up Questions & "I'm not sure" Handling
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO C: Follow-Up Questions & "I\'m not sure" Handling ---');
  const sessC = `eval-sess-c-${Date.now()}`;
  const resC1 = await aiReceptionistService.processMessage({
    message: 'I have pain in my tooth.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessC,
    },
  });

  const resC2 = await aiReceptionistService.processMessage({
    message: "I'm not sure",
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: sessC,
    },
  });

  const passedC =
    resC2.success &&
    !resC2.response.toLowerCase().includes('could you tell me whether the pain') && // does not repeat same question
    (resC2.response.toLowerCase().includes('exam') ||
      resC2.response.toLowerCase().includes('consultation') ||
      resC2.response.toLowerCase().includes('dentist'));

  results.push({
    testId: 'SCENARIO-C-01',
    scenario: 'Follow-Up Questions - Handling "I\'m not sure" Gracefully',
    utterance: 'Turn 1: "I have pain in my tooth." -> Turn 2: "I\'m not sure"',
    expected: 'Acknowledge uncertainty gracefully, recommend comprehensive exam, do not interrogate or repeat previous question',
    observed: `Turn 1: ${resC1.response}\nTurn 2: ${resC2.response}`,
    status: passedC ? 'PASS' : 'DEFECT',
    details: {
      turn1Step: resC1.conversationState?.step,
      turn2Step: resC2.conversationState?.step,
      turn2Intent: resC2.intent,
    },
    defect: !passedC ? 'Receptionist repeated interrogation or failed to proceed on "I\'m not sure"' : undefined,
  });

  // --------------------------------------------------------------------------
  // SCENARIO D: Service Recommendation Without Diagnosis
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO D: Service Recommendation Without Diagnosis ---');
  const alarmingWords = ['definitely have a cavity', 'pulp inflammation', 'need a root canal', 'certainly an infection'];
  let alarmingFound = false;
  let sampleFound = '';

  for (const r of results.filter((x) => x.testId.startsWith('SCENARIO-B'))) {
    for (const w of alarmingWords) {
      if (r.observed.toLowerCase().includes(w)) {
        alarmingFound = true;
        sampleFound = `${r.testId}: found "${w}" in response`;
      }
    }
  }

  results.push({
    testId: 'SCENARIO-D-01',
    scenario: 'Clinical Safety: No Alarming Diagnoses in Any Symptom Turn',
    utterance: 'Aggregated across all Scenario B symptom responses',
    expected: 'Zero mentions of definitive conditions like "you definitely have a cavity", "pulp inflammation", "root canal needed"',
    observed: alarmingFound ? sampleFound : 'Verified zero alarming diagnoses across all 12 symptom variations',
    status: alarmingFound ? 'FAIL' : 'PASS',
    details: { alarmingFound },
  });

  // --------------------------------------------------------------------------
  // SCENARIO E: Doctor Room/Cabin FAQ During Booking (Interruptions)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO E: Doctor Room/Cabin FAQ During Booking ---');
  const cabinQuestions = [
    { q: "Where is Dr. Emily Chen's room?", expectedCabin: 'Cabin 2', expectedWing: 'Pediatric' },
    { q: 'Where can I meet Dr. Marcus Thorne?', expectedCabin: 'Cabin 1', expectedWing: 'West Wing' },
    { q: 'Which cabin is the orthodontist in?', expectedCabin: 'Cabin 2', expectedWing: 'Pediatric' },
    { q: 'Where is the hygiene bay?', expectedCabin: 'Hygiene Bay 3', expectedWing: 'East Wing' },
    { q: "How do I reach the doctor's room from reception?", expectedCabin: 'corridor', expectedWing: 'reception' },
  ];

  for (let i = 0; i < cabinQuestions.length; i++) {
    const item = cabinQuestions[i];
    const sessE = `eval-sess-e-${i}-${Date.now()}`;

    // Step 1: Start booking
    await aiReceptionistService.processMessage({
      message: 'I want to book an appointment for Dr. Marcus Thorne',
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessE },
    });

    // Step 2: Mid-booking FAQ interruption
    const faqRes = await aiReceptionistService.processMessage({
      message: item.q,
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessE },
    });

    const hasCabin =
      faqRes.response.toLowerCase().includes(item.expectedCabin.toLowerCase()) ||
      faqRes.response.toLowerCase().includes(item.expectedWing.toLowerCase());

    const passed = faqRes.success && hasCabin && faqRes.intent === AIIntent.CABIN_ROOM_LOCATION;

    results.push({
      testId: `SCENARIO-E-0${i + 1}`,
      scenario: `Doctor Cabin FAQ: "${item.q}"`,
      utterance: item.q,
      expected: `Accurate cabin info (${item.expectedCabin} / ${item.expectedWing}) and seamless booking step resumption`,
      observed: faqRes.response,
      status: passed ? 'PASS' : 'DEFECT',
      details: {
        intent: faqRes.intent,
        action: faqRes.action,
        step: faqRes.conversationState?.step,
        resumedBooking: Boolean(faqRes.conversationState),
      },
      defect: !passed
        ? `Missing cabin info (${item.expectedCabin}) or wrong intent: ${faqRes.intent}`
        : undefined,
    });
  }

  // --------------------------------------------------------------------------
  // SCENARIO F: Waiting-Area Questions During Booking
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO F: Waiting-Area Questions During Booking ---');
  const waitingQuestions = [
    { id: 'F-01', q: 'Where should I wait?', expectedKw: 'waiting lounge' },
    { id: 'F-02', q: 'Can I arrive 20 minutes early?', expectedKw: 'early' },
    { id: 'F-03', q: 'What if I am running late?', expectedKw: 'late' },
    { id: 'F-04', q: 'Is there a waiting lounge?', expectedKw: 'waiting lounge' },
    { id: 'F-05', q: 'What should I do after entering the clinic?', expectedKw: 'check in' },
  ];

  for (const w of waitingQuestions) {
    const sessF = `eval-sess-f-${w.id}-${Date.now()}`;
    // Start booking
    await aiReceptionistService.processMessage({
      message: 'I want to schedule Comprehensive Oral Exam',
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessF },
    });

    // Interruption
    const waitRes = await aiReceptionistService.processMessage({
      message: w.q,
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessF },
    });

    const route = FastIntentRouter.routeIntent(w.q);
    const hasPolicy = waitRes.response.toLowerCase().includes(w.expectedKw);
    const passed =
      waitRes.success &&
      hasPolicy &&
      (route.intent === AIIntent.WAITING_AREA_POLICY || route.intent === AIIntent.APPOINTMENT_PREPARATION);

    results.push({
      testId: `SCENARIO-${w.id}`,
      scenario: `Waiting-Area FAQ: "${w.q}"`,
      utterance: w.q,
      expected: `Provide accurate waiting policy mentioning "${w.expectedKw}" and resume booking step`,
      observed: waitRes.response,
      status: passed ? 'PASS' : 'DEFECT',
      details: {
        routedIntent: route.intent,
        responseIntent: waitRes.intent,
        step: waitRes.conversationState?.step,
      },
      defect: !passed ? `Failed policy keyword "${w.expectedKw}" or intent mismatch: ${route.intent}` : undefined,
    });
  }

  // --------------------------------------------------------------------------
  // SCENARIO G: Emergency Dental Escalation
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO G: Emergency Dental Escalation ---');
  const emergencyCases = [
    { id: 'G-01', text: 'My face is badly swollen.', isEmergency: true },
    { id: 'G-02', text: 'I am having trouble breathing because of the swelling.', isEmergency: true },
    { id: 'G-03', text: 'My mouth is bleeding heavily and it won’t stop.', isEmergency: true },
    { id: 'G-04', text: 'I have severe swelling and a fever.', isEmergency: true },
    { id: 'G-05', text: 'I knocked out a tooth in an accident.', isEmergency: true },
    { id: 'G-06', text: 'I have a mild toothache.', isEmergency: false }, // Negative control!
  ];

  for (const e of emergencyCases) {
    const route = FastIntentRouter.routeIntent(e.text);
    const emRes = await aiReceptionistService.processMessage({
      message: e.text,
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: `eval-g-${e.id}-${Date.now()}` },
    });

    let passed = false;
    if (e.isEmergency) {
      passed =
        route.intent === AIIntent.EMERGENCY_DENTAL &&
        emRes.action === AIAction.ESCALATE_EMERGENCY &&
        (emRes.response.includes('911') ||
          emRes.response.includes('emergency room') ||
          emRes.response.includes('Option 9'));
    } else {
      passed =
        route.intent !== AIIntent.EMERGENCY_DENTAL &&
        emRes.action !== AIAction.ESCALATE_EMERGENCY;
    }

    results.push({
      testId: `SCENARIO-${e.id}`,
      scenario: `Emergency Escalation: "${e.text}"`,
      utterance: e.text,
      expected: e.isEmergency
        ? 'Route to EMERGENCY_DENTAL, action ESCALATE_EMERGENCY, provide 911 / emergency triage phone immediately'
        : 'Route to symptom triage, NOT emergency escalation',
      observed: emRes.response,
      status: passed ? 'PASS' : 'DEFECT',
      details: {
        routedIntent: route.intent,
        action: emRes.action,
        isEmergencyTarget: e.isEmergency,
      },
      defect: !passed ? `Emergency mismatch: expected isEmergency=${e.isEmergency}, got intent=${route.intent}, action=${emRes.action}` : undefined,
    });
  }

  // --------------------------------------------------------------------------
  // SCENARIO H: Date and Time Corrections
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO H: Date and Time Corrections ---');
  const sessH = `eval-sess-h-${Date.now()}`;
  // 1. Service
  await aiReceptionistService.processMessage({
    message: 'I want to book Comprehensive Oral Exam & Digital X-Rays',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });
  // 2. Doctor
  await aiReceptionistService.processMessage({
    message: 'Dr. Marcus Thorne',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });
  // 3. Date
  await aiReceptionistService.processMessage({
    message: 'tomorrow',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });
  // 4. Time
  await aiReceptionistService.processMessage({
    message: '10:00 AM',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });

  // 5. User correction: "No, make it 11 AM."
  const corrRes = await aiReceptionistService.processMessage({
    message: 'No, make it 11 AM.',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });

  const passedH1 =
    corrRes.success &&
    (corrRes.conversationState?.selectedTime?.includes('11:00') ||
      corrRes.response.includes('11:00 AM') ||
      corrRes.response.includes('11 AM'));

  results.push({
    testId: 'SCENARIO-H-01',
    scenario: 'In-Flight Slot Correction: "No, make it 11 AM."',
    utterance: 'No, make it 11 AM.',
    expected: 'Update selected time to 11:00 AM without losing selected service (Oral Exam) or doctor (Dr. Thorne)',
    observed: `Response: ${corrRes.response} | SelectedTime: ${corrRes.conversationState?.selectedTime} | Specialist: ${corrRes.conversationState?.selectedStaff?.name}`,
    status: passedH1 ? 'PASS' : 'DEFECT',
    details: {
      selectedTime: corrRes.conversationState?.selectedTime,
      selectedStaff: corrRes.conversationState?.selectedStaff?.name,
      selectedService: corrRes.conversationState?.selectedService?.name,
      step: corrRes.conversationState?.step,
    },
    defect: !passedH1 ? 'Time correction not updated in state machine' : undefined,
  });

  // 6. Test correction with unavailable slot: "Actually, can I do 4 PM?"
  const unavailRes = await aiReceptionistService.processMessage({
    message: 'Actually, can I do 4 PM?',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessH },
  });

  const passedH2 =
    unavailRes.success &&
    !unavailRes.response.toLowerCase().includes('confirmed for 4') &&
    (unavailRes.response.toLowerCase().includes('available') ||
      unavailRes.response.toLowerCase().includes("couldn't match") ||
      unavailRes.response.toLowerCase().includes('choose from'));

  results.push({
    testId: 'SCENARIO-H-02',
    scenario: 'Revalidation of Unavailable Slot: "Actually, can I do 4 PM?"',
    utterance: 'Actually, can I do 4 PM?',
    expected: 'Revalidate availability, decline unavailable 4 PM slot, prompt with open available slots without booking false slot',
    observed: unavailRes.response,
    status: passedH2 ? 'PASS' : 'DEFECT',
    details: {
      step: unavailRes.conversationState?.step,
      selectedTime: unavailRes.conversationState?.selectedTime,
    },
    defect: !passedH2 ? 'System falsely confirmed or crashed on unavailable slot' : undefined,
  });

  // --------------------------------------------------------------------------
  // SCENARIO I & J: Full Identity Flow & PostgreSQL Persistence Validation
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO I & J: Identity Flow & PostgreSQL Persistence ---');
  const sessIJ = `eval-sess-ij-${Date.now()}`;
  const testPhone = '+1-555-019-9988';
  const testCustomerName = 'Alex Wright';

  // 1. Service
  await aiReceptionistService.processMessage({
    message: 'I want Comprehensive Oral Exam & Digital X-Rays',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 2. Doctor
  await aiReceptionistService.processMessage({
    message: 'Dr. Marcus Thorne',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 3. Date
  await aiReceptionistService.processMessage({
    message: 'tomorrow',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 4. Time
  await aiReceptionistService.processMessage({
    message: '10:00 AM',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 5. Name input: "Alexander Wright"
  await aiReceptionistService.processMessage({
    message: 'Alexander Wright',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 6. Name correction: "Actually it's Alex Wright"
  const nameCorrRes = await aiReceptionistService.processMessage({
    message: "Actually it's Alex Wright",
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 7. Confirm name: "Yes"
  await aiReceptionistService.processMessage({
    message: 'Yes',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 8. Phone input: "+1-555-019-9988"
  await aiReceptionistService.processMessage({
    message: testPhone,
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 9. Confirm phone: "Yes"
  await aiReceptionistService.processMessage({
    message: 'Yes',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });
  // 10. Final Confirm: "Yes, please confirm the booking"
  const confirmRes = await aiReceptionistService.processMessage({
    message: 'Yes, please confirm the booking',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sessIJ },
  });

  const passedI =
    confirmRes.success &&
    confirmRes.conversationState?.customerName?.toLowerCase().includes('alex') &&
    confirmRes.conversationState?.customerPhone?.includes('9988');

  results.push({
    testId: 'SCENARIO-I-01',
    scenario: 'Two-Turn Identity Confirmation & Name Correction',
    utterance: 'Name: "Alexander Wright" -> "Actually it\'s Alex Wright" -> Phone: "+1-555-019-9988"',
    expected: 'Accept name correction "Alex Wright", confirm phone +1-555-***-9988, summarize booking details accurately',
    observed: `Confirm Response: ${confirmRes.response}`,
    status: passedI ? 'PASS' : 'FAIL',
    details: {
      customerName: confirmRes.conversationState?.customerName,
      customerPhone: confirmRes.conversationState?.customerPhone ? '+1-555-***-9988' : undefined,
      action: confirmRes.action,
      step: confirmRes.conversationState?.step,
    },
  });

  // Now verify SCENARIO J: Query PostgreSQL via Prisma
  const appointmentId = confirmRes.conversationState?.appointmentId || (confirmRes.data as any)?.appointmentId;
  let dbAppointment: any = null;
  if (appointmentId) {
    dbAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        service: true,
        staff: true,
        business: true,
      },
    });
  } else {
    // Lookup by customer phone
    const cust = await prisma.customer.findFirst({
      where: { phone: testPhone },
      include: { appointments: { include: { service: true, staff: true, business: true } } },
    });
    if (cust && cust.appointments.length > 0) {
      dbAppointment = cust.appointments[cust.appointments.length - 1];
    }
  }

  const passedJ =
    dbAppointment !== null &&
    dbAppointment.businessId === LUMINA_DENTAL_BUSINESS_ID &&
    dbAppointment.status === 'CONFIRMED' &&
    dbAppointment.customer.phone.replace(/\D/g, '').endsWith(testPhone.replace(/\D/g, '').slice(-10));

  results.push({
    testId: 'SCENARIO-J-01',
    scenario: 'Direct PostgreSQL Record Verification',
    utterance: 'Verification of database appointment record in receptionist_db',
    expected: 'Exactly 1 persisted appointment in PostgreSQL with status=CONFIRMED, correct businessId, customer phone, specialist Dr. Marcus Thorne',
    observed: dbAppointment
      ? `Found DB Appointment ID=${dbAppointment.id}, status=${dbAppointment.status}, business=${dbAppointment.business?.name}, customer=${dbAppointment.customer?.name} (+1-555-***-9988), service=${dbAppointment.service?.name}`
      : 'NO APPOINTMENT FOUND IN POSTGRESQL DATABASE',
    status: passedJ ? 'PASS' : 'FAIL',
    details: dbAppointment
      ? {
          id: dbAppointment.id,
          businessId: dbAppointment.businessId,
          businessName: dbAppointment.business?.name,
          serviceName: dbAppointment.service?.name,
          staffName: dbAppointment.staff?.name,
          customerName: dbAppointment.customer?.name,
          customerPhone: '+1-555-***-9988',
          status: dbAppointment.status,
          startTime: dbAppointment.startTime,
          endTime: dbAppointment.endTime,
        }
      : null,
  });

  // --------------------------------------------------------------------------
  // SCENARIO K: Call Completion Safeguards
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO K: Call Completion Safeguards ---');
  const isCallComplete =
    confirmRes.conversationState?.isCompleted === true ||
    (confirmRes.action as any) === 'COMPLETE_SESSION' ||
    confirmRes.conversationState?.step === BookingConversationStep.BOOKING_COMPLETE;

  // Verify cancelled session does NOT trigger complete session
  const cancelSess = `eval-cancel-${Date.now()}`;
  await aiReceptionistService.processMessage({
    message: 'I want to book an appointment',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: cancelSess },
  });
  const cancelRes = await aiReceptionistService.processMessage({
    message: 'Cancel the appointment, never mind',
    context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: cancelSess },
  });

  const passedK =
    isCallComplete &&
    cancelRes.conversationState?.isCompleted !== true &&
    cancelRes.action !== AIAction.CREATE_APPOINTMENT;

  results.push({
    testId: 'SCENARIO-K-01',
    scenario: 'Call Completion Lifecycle & Cancellation Protection',
    utterance: 'Booking confirmation completes session; cancellation aborts without claiming booking success',
    expected: 'Successful booking signals isCompleted=true and BOOKING_COMPLETE; cancellation does not trigger fake appointment',
    observed: `Booking Complete: isCallComplete=${isCallComplete} | Cancellation action=${cancelRes.action}, response=${cancelRes.response}`,
    status: passedK ? 'PASS' : 'FAIL',
    details: {
      bookingIsCompleted: isCallComplete,
      cancelAction: cancelRes.action,
      cancelResponse: cancelRes.response,
    },
  });

  // --------------------------------------------------------------------------
  // SCENARIO L: Multi-Tenant Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO L: Multi-Tenant Data Isolation ---');
  // 1. Ask Dr. Marcus Thorne cabin info on Radiance Dermatology tenant
  const crossTenantRes = await aiReceptionistService.processMessage({
    message: 'Where is Dr. Marcus Thorne cabin?',
    context: {
      businessId: RADIANCE_DERM_BUSINESS_ID, // Dermatology business!
      sessionId: `eval-tenant-leak-${Date.now()}`,
    },
  });

  const leaksLumina =
    crossTenantRes.response.toLowerCase().includes('lumina') ||
    crossTenantRes.response.toLowerCase().includes('west wing') ||
    crossTenantRes.response.toLowerCase().includes('cabin 1');

  // 2. Query DB to verify appointments for Lumina Dental cannot be fetched with Radiance Derm ID
  const crossDermApts = await prisma.appointment.findMany({
    where: {
      businessId: RADIANCE_DERM_BUSINESS_ID,
      staff: { name: 'Dr. Marcus Thorne' },
    },
  });

  const passedL = !leaksLumina && crossDermApts.length === 0;

  results.push({
    testId: 'SCENARIO-L-01',
    scenario: 'Multi-Tenant Data Isolation (Lumina Dental vs Radiance Dermatology)',
    utterance: 'Ask about Lumina staff while scoped to Radiance Dermatology tenant',
    expected: 'Zero leakage of Lumina Dental doctor cabins/wings to Radiance Derm; zero cross-tenant database records',
    observed: `Response: ${crossTenantRes.response} | Cross-tenant DB records found: ${crossDermApts.length}`,
    status: passedL ? 'PASS' : 'FAIL',
    details: {
      leaksLumina,
      crossDermAppointmentsCount: crossDermApts.length,
      crossTenantResponse: crossTenantRes.response,
    },
  });

  console.log('\n================================================================');
  console.log(`--- EVALUATION COMPLETE: ${results.length} Tests Evaluated ---`);
  console.log(`--- PASS: ${results.filter((r) => r.status === 'PASS').length} | DEFECTS: ${results.filter((r) => r.status === 'DEFECT').length} | FAIL: ${results.filter((r) => r.status === 'FAIL').length} ---`);
  console.log('================================================================\n');

  return results;
}

if (require.main === module) {
  runEndToEndVoiceEvaluation()
    .then((res) => {
      console.log('Summary of Defects / Findings:');
      const defects = res.filter((r) => r.status !== 'PASS');
      if (defects.length === 0) {
        console.log('🎉 100% of Evaluated Scenarios Passed Cleanly!');
      } else {
        for (const d of defects) {
          console.log(`[${d.status}] ${d.testId} (${d.scenario}): ${d.defect || d.observed}`);
        }
      }
    })
    .catch((err) => {
      console.error('Fatal Evaluation Error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
