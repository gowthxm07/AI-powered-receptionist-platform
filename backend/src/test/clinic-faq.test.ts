import assert from 'assert';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIIntent } from '../modules/ai/types/intent.types';
import {
  BookingConversationStep,
  sessionStore,
  appointmentStateMachine,
} from '../modules/ai/conversation';
import {
  findClinicFAQ,
  LUMINA_DENTAL_BUSINESS_ID,
  isUnrelatedInquiry,
} from '../modules/ai/knowledge';
import { prisma } from '../lib/prisma';

export async function runClinicFaqTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- STARTING CLINIC FAQ & KNOWLEDGE TEST SUITE ---');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST A: Visitor Policy ("Can I bring my mother with me?")
  // --------------------------------------------------------------------------
  console.log('Test A: Visitor Policy Inquiry');
  const resA = await aiReceptionistService.processMessage({
    message: 'Can I bring my mother with me?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-a-${Date.now()}`,
    },
  });
  assert.strictEqual(resA.success, true);
  assert.strictEqual(resA.intent, AIIntent.CLINIC_FAQ);
  assert(
    resA.response.toLowerCase().includes('welcome to bring a family member') ||
      resA.response.toLowerCase().includes('companion'),
    `Expected visitor policy answer, got: ${resA.response}`
  );
  console.log('  ✓ Correctly answered visitor policy for "Can I bring my mother with me?".');

  // --------------------------------------------------------------------------
  // TEST B: Paraphrase ("Is it okay if my husband accompanies me?")
  // --------------------------------------------------------------------------
  console.log('\nTest B: Visitor Policy Paraphrase');
  const resB = await aiReceptionistService.processMessage({
    message: 'Is it okay if my husband accompanies me?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-b-${Date.now()}`,
    },
  });
  assert.strictEqual(resB.success, true);
  assert.strictEqual(resB.intent, AIIntent.CLINIC_FAQ);
  assert(
    resB.response.toLowerCase().includes('welcome to bring') ||
      resB.response.toLowerCase().includes('companion') ||
      resB.response.toLowerCase().includes('support'),
    `Expected companion policy answer, got: ${resB.response}`
  );
  console.log('  ✓ Correctly mapped "Is it okay if my husband accompanies me?" to visitor policy.');

  // --------------------------------------------------------------------------
  // TEST C: Caregiver ("Can my caregiver come inside?")
  // --------------------------------------------------------------------------
  console.log('\nTest C: Caregiver Policy Inquiry');
  const resC = await aiReceptionistService.processMessage({
    message: 'Can my caregiver come inside?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-c-${Date.now()}`,
    },
  });
  assert.strictEqual(resC.success, true);
  assert.strictEqual(resC.intent, AIIntent.CLINIC_FAQ);
  assert(
    resC.response.toLowerCase().includes('caregiver') ||
      resC.response.toLowerCase().includes('family member') ||
      resC.response.toLowerCase().includes('support'),
    `Expected caregiver confirmation, got: ${resC.response}`
  );
  console.log('  ✓ Correctly handled "Can my caregiver come inside?".');

  // --------------------------------------------------------------------------
  // TEST D: Preparation ("Do I need to bring my previous dental reports?")
  // --------------------------------------------------------------------------
  console.log('\nTest D: Preparation & Reports Inquiry');
  const resD = await aiReceptionistService.processMessage({
    message: 'Do I need to bring my previous dental reports?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-d-${Date.now()}`,
    },
  });
  assert.strictEqual(resD.success, true);
  assert(
    resD.response.toLowerCase().includes('photo id') ||
      resD.response.toLowerCase().includes('reports') ||
      resD.response.toLowerCase().includes('x-ray'),
    `Expected preparation details, got: ${resD.response}`
  );
  console.log('  ✓ Correctly answered reports & preparation question.');

  // --------------------------------------------------------------------------
  // TEST E: Parking ("Where can I park?")
  // --------------------------------------------------------------------------
  console.log('\nTest E: Parking Policy Inquiry');
  const resE = await aiReceptionistService.processMessage({
    message: 'Where can I park?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-e-${Date.now()}`,
    },
  });
  assert.strictEqual(resE.success, true);
  assert(
    resE.response.toLowerCase().includes('parking') &&
      resE.response.toLowerCase().includes('behind our building'),
    `Expected parking guidance, got: ${resE.response}`
  );
  console.log('  ✓ Grounded parking guidance verified.');

  // --------------------------------------------------------------------------
  // TEST F: Accessibility ("Is the clinic wheelchair accessible?")
  // --------------------------------------------------------------------------
  console.log('\nTest F: Accessibility Inquiry');
  const resF = await aiReceptionistService.processMessage({
    message: 'Is the clinic wheelchair accessible?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-f-${Date.now()}`,
    },
  });
  assert.strictEqual(resF.success, true);
  assert(
    resF.response.toLowerCase().includes('wheelchair accessible') ||
      resF.response.toLowerCase().includes('ramp'),
    `Expected wheelchair accessibility info, got: ${resF.response}`
  );
  console.log('  ✓ Wheelchair accessibility verified.');

  // --------------------------------------------------------------------------
  // TEST G: Appointment Policy ("Do you accept walk-ins?")
  // --------------------------------------------------------------------------
  console.log('\nTest G: Walk-in Policy Inquiry');
  const resG = await aiReceptionistService.processMessage({
    message: 'Do you accept walk-ins?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-g-${Date.now()}`,
    },
  });
  assert.strictEqual(resG.success, true);
  assert(
    resG.response.toLowerCase().includes('scheduled appointments') ||
      resG.response.toLowerCase().includes('walk-in') ||
      resG.response.toLowerCase().includes('emergency slots'),
    `Expected walk-in policy, got: ${resG.response}`
  );
  console.log('  ✓ Walk-in appointment policy verified.');

  // --------------------------------------------------------------------------
  // TEST H: Operating Hours ("What time do you open?")
  // --------------------------------------------------------------------------
  console.log('\nTest H: Operating Hours Inquiry');
  const resH = await aiReceptionistService.processMessage({
    message: 'What time do you open?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-h-${Date.now()}`,
    },
  });
  assert.strictEqual(resH.success, true);
  assert(
    resH.response.toLowerCase().includes('8:00 am') ||
      resH.response.toLowerCase().includes('monday to friday'),
    `Expected hours, got: ${resH.response}`
  );
  console.log('  ✓ Clinic hours verified.');

  // --------------------------------------------------------------------------
  // TEST I: Unknown Policy ("Do you offer free valet parking?")
  // --------------------------------------------------------------------------
  console.log('\nTest I: Unknown Policy Grounding & Anti-Hallucination');
  const resI = await aiReceptionistService.processMessage({
    message: 'Do you offer free valet parking service at the entrance?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-i-${Date.now()}`,
    },
  });
  assert.strictEqual(resI.success, true);
  assert(
    resI.response.toLowerCase().includes('front desk') ||
      resI.response.toLowerCase().includes('don\'t have specific information') ||
      resI.response.toLowerCase().includes('behind our building'),
    `Expected safe fallback or verified rear parking, got: ${resI.response}`
  );
  assert(
    !resI.response.toLowerCase().includes('yes we have valet'),
    'Should not fabricate valet parking'
  );
  console.log('  ✓ Safely avoided fabricating unverified clinic policies.');

  // --------------------------------------------------------------------------
  // TEST J: Completely Unrelated Query ("What is the weather today?")
  // --------------------------------------------------------------------------
  console.log('\nTest J: Completely Unrelated Query Redirection');
  const resJ = await aiReceptionistService.processMessage({
    message: 'What is the weather today?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: `test-faq-j-${Date.now()}`,
    },
  });
  assert.strictEqual(resJ.success, true);
  assert.strictEqual(resJ.intent, AIIntent.UNRELATED_INQUIRY);
  assert(
    resJ.response.toLowerCase().includes('lumina dental care') ||
      resJ.response.toLowerCase().includes('appointments'),
    `Expected polite clinic redirection, got: ${resJ.response}`
  );
  console.log('  ✓ Successfully redirected off-topic query to clinic scope.');

  // --------------------------------------------------------------------------
  // TEST K & L & M: Mid-Booking FAQ Interruptions at Every Single Step
  // --------------------------------------------------------------------------
  console.log('\nTest K, L, M: FAQ Interruptions at Every Booking Step & State Preservation');

  const stepsToTest: Array<{
    step: BookingConversationStep;
    setupSession: (sessId: string) => Promise<void>;
    expectedResumeCheck: (res: string) => boolean;
    stepName: string;
  }> = [
    {
      stepName: 'BOOKING_COLLECT_SERVICE',
      step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('which service'),
    },
    {
      stepName: 'BOOKING_COLLECT_STAFF',
      step: BookingConversationStep.BOOKING_COLLECT_STAFF,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_COLLECT_STAFF,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('specialist') || res.toLowerCase().includes('anyone'),
    },
    {
      stepName: 'BOOKING_COLLECT_DATE',
      step: BookingConversationStep.BOOKING_COLLECT_DATE,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_COLLECT_DATE,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('date'),
    },
    {
      stepName: 'BOOKING_SELECT_SLOT',
      step: BookingConversationStep.BOOKING_SELECT_SLOT,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_SELECT_SLOT,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          availableSlots: [{ timeLabel: '10:00 AM', startTime: '2026-10-15T10:00:00.000Z', endTime: '2026-10-15T10:30:00.000Z' }],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('time') || res.toLowerCase().includes('10:00 am'),
    },
    {
      stepName: 'BOOKING_COLLECT_CUSTOMER_NAME',
      step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          selectedTimeLabel: '10:00 AM',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('full name'),
    },
    {
      stepName: 'BOOKING_CONFIRM_CUSTOMER_NAME',
      step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          selectedTimeLabel: '10:00 AM',
          customerName: 'Robert Vance',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('robert vance'),
    },
    {
      stepName: 'BOOKING_COLLECT_CUSTOMER_PHONE',
      step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          selectedTimeLabel: '10:00 AM',
          customerName: 'Robert Vance',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('phone number'),
    },
    {
      stepName: 'BOOKING_CONFIRM_CUSTOMER_PHONE',
      step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          selectedTimeLabel: '10:00 AM',
          customerName: 'Robert Vance',
          customerPhone: '555-019-2831',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('555-019-2831'),
    },
    {
      stepName: 'BOOKING_CONFIRM',
      step: BookingConversationStep.BOOKING_CONFIRM,
      setupSession: async (sessId) => {
        await sessionStore.setSession({
          sessionId: sessId,
          businessId: LUMINA_DENTAL_BUSINESS_ID,
          step: BookingConversationStep.BOOKING_CONFIRM,
          selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
          selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
          selectedStaffId: 's0000001-0000-0000-0000-000000000001',
          selectedStaffName: 'Dr. Marcus Thorne',
          selectedDate: '2026-10-15',
          selectedTimeLabel: '10:00 AM',
          selectedStartTime: '2026-10-15T10:00:00.000Z',
          selectedEndTime: '2026-10-15T10:30:00.000Z',
          customerId: 'c0000001-0000-0000-0000-000000000001',
          customerName: 'Robert Vance',
          customerPhone: '555-019-2831',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        });
      },
      expectedResumeCheck: (res) => res.toLowerCase().includes('confirm'),
    },
  ];

  for (const item of stepsToTest) {
    const sId = `test-step-${item.stepName}-${Date.now()}`;
    await item.setupSession(sId);

    const sessionBefore = await sessionStore.getSession(sId);
    assert(sessionBefore, `Session should exist for ${item.stepName}`);
    assert.strictEqual(sessionBefore.step, item.step);

    // Caller interrupts with an FAQ inquiry
    const turnRes = await aiReceptionistService.processMessage({
      message: 'Can I bring my mother with me?',
      context: { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: sId },
    });

    assert.strictEqual(turnRes.success, true);
    assert(
      turnRes.response.toLowerCase().includes('welcome to bring') ||
        turnRes.response.toLowerCase().includes('companion') ||
        turnRes.response.toLowerCase().includes('support'),
      `FAQ answer must be present at step ${item.stepName}. Got: ${turnRes.response}`
    );
    assert(
      item.expectedResumeCheck(turnRes.response),
      `Resumption prompt must be tailored to step ${item.stepName}. Got: ${turnRes.response}`
    );

    // Verify session state was NOT mutated or advanced
    const sessionAfter = await sessionStore.getSession(sId);
    assert(sessionAfter, `Session should still exist after FAQ at ${item.stepName}`);
    assert.strictEqual(
      sessionAfter.step,
      sessionBefore.step,
      `Step must not mutate at ${item.stepName}`
    );
    assert.strictEqual(
      sessionAfter.selectedServiceId,
      sessionBefore.selectedServiceId,
      'Service must be preserved'
    );
    assert.strictEqual(
      sessionAfter.customerName,
      sessionBefore.customerName,
      'Customer name must be preserved'
    );
    assert.strictEqual(
      sessionAfter.customerPhone,
      sessionBefore.customerPhone,
      'Customer phone must be preserved'
    );

    console.log(`  ✓ Step ${item.stepName}: FAQ answered, state strictly preserved.`);
  }

  // --------------------------------------------------------------------------
  // TEST N: Full Multi-Turn Booking with Mid-Flow FAQ Interruption & DB Persistence
  // --------------------------------------------------------------------------
  console.log('\nTest N: Multi-Turn Booking with Mid-Flow FAQ and PostgreSQL Persistence');
  const fullSessionId = `test-full-faq-booking-${Date.now()}`;
  const ctx = { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: fullSessionId };

  // 1. Service
  const t1 = await aiReceptionistService.processMessage({
    message: 'I want Comprehensive Oral Exam & Digital X-Rays',
    context: ctx,
  });
  assert(t1.response.toLowerCase().includes('specialist'));

  // 2. Doctor
  const t2 = await aiReceptionistService.processMessage({
    message: 'Dr. Marcus Thorne',
    context: ctx,
  });
  assert(t2.response.toLowerCase().includes('date'));

  // 3. Date
  const t3 = await aiReceptionistService.processMessage({
    message: 'tomorrow',
    context: ctx,
  });
  assert(t3.response.toLowerCase().includes('which one') || t3.response.toLowerCase().includes('available times'));

  // 4. FAQ Interruption 1: Visitor Policy
  const tFaq1 = await aiReceptionistService.processMessage({
    message: 'Can I bring my mother with me?',
    context: ctx,
  });
  assert(tFaq1.response.toLowerCase().includes('welcome to bring'));
  assert(tFaq1.response.toLowerCase().includes('time') || tFaq1.response.toLowerCase().includes('which'));

  // 5. Time slot (dynamically pick first available slot)
  const fullSession = await sessionStore.getSession(fullSessionId);
  const slotToPick = fullSession?.availableSlots?.[0]?.timeLabel || '09:00 AM';
  const t4 = await aiReceptionistService.processMessage({
    message: slotToPick,
    context: ctx,
  });
  assert(t4.response.toLowerCase().includes('full name'));

  // 6. FAQ Interruption 2: Parking
  const tFaq2 = await aiReceptionistService.processMessage({
    message: 'Is there parking available?',
    context: ctx,
  });
  assert(tFaq2.response.toLowerCase().includes('parking'));
  assert(tFaq2.response.toLowerCase().includes('full name'));

  // 7. Customer Name
  const t5 = await aiReceptionistService.processMessage({
    message: 'Eleanor Vance',
    context: ctx,
  });
  assert(t5.response.toLowerCase().includes('eleanor vance'));

  // 8. Confirm Name
  const t6 = await aiReceptionistService.processMessage({
    message: 'Yes',
    context: ctx,
  });
  assert(t6.response.toLowerCase().includes('phone number'));

  // 9. Customer Phone
  const t7 = await aiReceptionistService.processMessage({
    message: '555-882-9911',
    context: ctx,
  });
  assert(t7.response.toLowerCase().includes('555-882-9911'));

  // 10. Confirm Phone
  const t8 = await aiReceptionistService.processMessage({
    message: 'Yes',
    context: ctx,
  });
  assert(t8.response.toLowerCase().includes('confirm'));

  // 11. FAQ Interruption 3: What time do you open?
  const tFaq3 = await aiReceptionistService.processMessage({
    message: 'Actually, what time do you open?',
    context: ctx,
  });
  assert(tFaq3.response.toLowerCase().includes('8:00 am'));
  assert(tFaq3.response.toLowerCase().includes('confirm'));

  // 12. Final Booking Confirmation
  const t9 = await aiReceptionistService.processMessage({
    message: 'Yes, please confirm',
    context: ctx,
  });
  assert(t9.response.toLowerCase().includes('successfully booked'));
  assert.strictEqual(t9.conversationState?.isCompleted, true);

  // Direct PostgreSQL Database Verification
  const apptRecord = await prisma.appointment.findFirst({
    where: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      customer: { name: 'Eleanor Vance' },
    },
    include: {
      customer: true,
      service: true,
      staff: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  assert(apptRecord, 'Appointment must be persisted in PostgreSQL');
  assert.strictEqual(apptRecord.customer.name, 'Eleanor Vance');
  assert.strictEqual(apptRecord.service.name, 'Comprehensive Oral Exam & Digital X-Rays');
  assert.strictEqual(apptRecord.staff?.name, 'Dr. Marcus Thorne');
  assert.strictEqual(apptRecord.status, 'CONFIRMED');

  console.log(`  ✓ Verified DB Record: ${apptRecord.id} for ${apptRecord.customer.name} with ${apptRecord.staff?.name}`);
  console.log('  ✓ Multi-turn flow completed cleanly with 3 separate FAQ interruptions!');

  // Clean up test appointment to keep candidate slots free for subsequent runs
  await prisma.appointment.delete({ where: { id: apptRecord.id } });
  await prisma.customer.delete({ where: { id: apptRecord.customerId } }).catch(() => {});

  console.log('\n======================================================');
  console.log('🎉 ALL CLINIC FAQ & KNOWLEDGE TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================\n');
}

if (require.main === module) {
  runClinicFaqTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
