import assert from 'assert';
import { prisma } from '../lib/prisma';
import {
  AIModel,
  AIModelRequest,
  AIModelResponse,
  AIModelStreamChunk,
} from '../modules/ai/model';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { InMemorySessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { toolRouter } from '../modules/ai/tools/router';
import { AIConversationContext } from '../modules/ai/types/context.types';
import { AIIntent } from '../modules/ai/types/intent.types';
import { NameParser } from '../modules/ai/conversation/parsers/name-parser';

class MockAIModel implements AIModel {
  public readonly name: string = 'MockAIModel';
  public readonly modelId: string = 'mock-llama';
  public generateCallCount: number = 0;
  public cannedResponse: string = 'I am your virtual assistant.';

  public async generate(request: AIModelRequest): Promise<AIModelResponse> {
    this.generateCallCount++;
    return {
      text: this.cannedResponse,
      model: this.modelId,
      metrics: { totalDurationMs: 30 },
      success: true,
    };
  }

  public async *generateStream(request: AIModelRequest): AsyncIterable<AIModelStreamChunk> {
    yield { type: 'text', text: this.cannedResponse };
    yield { type: 'done' };
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }
}

export async function runVoiceAppointmentPersistenceTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Voice Appointment Persistence Tests ---');
  console.log('======================================================');

  // ----------------------------------------------------
  // 1. NameParser Unit Verification
  // ----------------------------------------------------
  console.log('\n1. Testing NameParser Carrier Phrase Stripping & Phone Extraction:');

  const p1 = NameParser.parseName('My name is Arthur Dent');
  assert.strictEqual(p1.isValid, true);
  assert.strictEqual(p1.name, 'Arthur Dent');
  console.log('  ✓ Stripped carrier phrase: "My name is Arthur Dent" -> "Arthur Dent".');

  const p2 = NameParser.parseName('Hello, this is Dr. Sarah Jenkins please');
  assert.strictEqual(p2.isValid, true);
  assert.strictEqual(p2.name, 'Dr. Sarah Jenkins');
  console.log('  ✓ Stripped greeting and polite suffix: "Dr. Sarah Jenkins".');

  const p3 = NameParser.parseName('My name is David Miller and my number is 555-444-3322');
  assert.strictEqual(p3.isValid, true);
  assert.strictEqual(p3.name, 'David Miller');
  assert(p3.phone?.includes('555-444-3322') || p3.phone?.includes('5554443322'));
  console.log('  ✓ Extracted inline phone + name in single utterance.');

  const p4 = NameParser.extractPhone('five five five one two three four five six seven');
  assert.strictEqual(p4, '5551234567');
  console.log('  ✓ Converted spoken number words to digits: "5551234567".');

  const p5 = NameParser.parseName('no, never mind');
  assert.strictEqual(p5.isValid, false);
  console.log('  ✓ Correctly rejected cancellation/noise input as name.');

  // ----------------------------------------------------
  // 2. Multi-Turn Public Voice Booking (Unknown Customer)
  // ----------------------------------------------------
  let isDbAvailable = false;
  let business: any = null;
  try {
    business = await prisma.business.findFirst({
      where: { name: 'Lumina Dental Care' },
    });
    isDbAvailable = !!business;
  } catch (err) {
    console.log('  ⚠️  PostgreSQL is not currently reachable (Docker Desktop stopped). Skipping live DB insertion.');
  }

  if (isDbAvailable && business) {
    const sessionStore = new InMemorySessionStore();
    const mockModel = new MockAIModel();
    const receptionist = new AIReceptionistService({
      toolRouter,
      aiModel: mockModel,
      sessionStore,
    });

    const testSessionId = `voice-persistence-session-${Date.now()}`;
    const context: AIConversationContext = {
      businessId: business.id,
      sessionId: testSessionId,
      channel: 'VOICE',
      metadata: {
        businessName: business.name,
      },
    };

    let createdAppointmentId: string | null = null;
    let createdCustomerId: string | null = null;
    const testPhone = `+1-555-999-${Math.floor(1000 + Math.random() * 9000)}`;
    const testName = 'Marcus Vance';

    try {
    // Turn 1: Inbound booking intent
    const t1 = await receptionist.processMessage({
      message: 'I would like to book a dental appointment',
      context,
    });
    assert.strictEqual(t1.success, true);
    assert(t1.response.includes('Which service'));
    console.log('  ✓ Turn 1 -> Inbound booking intent started.');

    // Turn 2: Service Selection
    const t2 = await receptionist.processMessage({
      message: 'Comprehensive Oral Exam',
      context,
    });
    assert.strictEqual(t2.success, true);
    assert(t2.response.includes('preferred specialist'));
    console.log('  ✓ Turn 2 -> Service matched.');

    // Turn 3: Staff Selection ("Anyone")
    const t3 = await receptionist.processMessage({
      message: 'Anyone is fine',
      context,
    });
    assert.strictEqual(t3.success, true);
    assert(t3.response.includes('What date'));
    console.log('  ✓ Turn 3 -> Staff "anyone" selected.');

    // Turn 4: Date Selection
    const t4 = await receptionist.processMessage({
      message: 'Tomorrow',
      context,
    });
    assert.strictEqual(t4.success, true);
    assert(t4.response.includes('Available times'));
    const s4 = await sessionStore.getSession(testSessionId);
    assert(s4?.availableSlots && s4.availableSlots.length > 0);
    console.log(`  ✓ Turn 4 -> Found ${s4.availableSlots.length} available slots.`);

    // Turn 5: Slot Selection -> MUST transition to BOOKING_COLLECT_CUSTOMER_NAME
    const chosenSlot = s4.availableSlots[0];
    const t5 = await receptionist.processMessage({
      message: chosenSlot.timeLabel,
      context,
    });
    assert.strictEqual(t5.success, true);
    assert(t5.response.includes('May I have your full name') || t5.response.includes('full name'));
    const s5 = await sessionStore.getSession(testSessionId);
    assert.strictEqual(s5?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME);
    // Crucial check: staff member is assigned even when "anyone" was chosen
    assert(s5?.selectedStaffId, 'Specialist must be assigned from the available slot');
    console.log(`  ✓ Turn 5 -> Slot chosen, assigned specialist '${s5.selectedStaffName}', asked for caller full name.`);

    // Turn 6: Name Collection -> MUST transition to BOOKING_CONFIRM_CUSTOMER_NAME
    const t6 = await receptionist.processMessage({
      message: `My name is ${testName}`,
      context,
    });
    assert.strictEqual(t6.success, true);
    assert(t6.response.includes('your name is') && t6.response.includes(testName));
    const s6 = await sessionStore.getSession(testSessionId);
    assert.strictEqual(s6?.step, BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME);
    assert.strictEqual(s6?.customerName, testName);
    console.log(`  ✓ Turn 6 -> Captured caller name '${testName}', asked for explicit name confirmation.`);

    // Turn 6b: Name Confirmation -> MUST transition to BOOKING_COLLECT_CUSTOMER_PHONE
    const t6b = await receptionist.processMessage({
      message: 'Yes, that is correct',
      context,
    });
    assert.strictEqual(t6b.success, true);
    assert(t6b.response.includes('phone number') || t6b.response.includes('provide your phone'));
    const s6b = await sessionStore.getSession(testSessionId);
    assert.strictEqual(s6b?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE);
    assert.strictEqual(s6b?.customerName, testName);
    console.log(`  ✓ Turn 6b -> Confirmed caller name '${testName}', advanced to phone number collection.`);

    // Turn 7: Phone Collection -> MUST transition to BOOKING_CONFIRM_CUSTOMER_PHONE
    const t7 = await receptionist.processMessage({
      message: testPhone,
      context,
    });
    assert.strictEqual(t7.success, true);
    assert(t7.response.includes('heard your phone number') || t7.response.includes('Is that correct'));
    const s7 = await sessionStore.getSession(testSessionId);
    assert.strictEqual(s7?.step, BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE);
    console.log(`  ✓ Turn 7 -> Captured phone number, asked for explicit phone confirmation.`);

    // Turn 7b: Phone Confirmation -> MUST resolve customer and prompt confirmation
    const t7b = await receptionist.processMessage({
      message: 'Yes, correct',
      context,
    });
    assert.strictEqual(t7b.success, true);
    assert(t7b.response.includes('Please confirm') || t7b.response.includes('Should I confirm'));
    assert(t7b.response.includes(testName));
    const s7b = await sessionStore.getSession(testSessionId);
    assert.strictEqual(s7b?.step, BookingConversationStep.BOOKING_CONFIRM);
    assert(s7b?.customerId, 'Customer record must be resolved or created');
    createdCustomerId = s7b.customerId;
    console.log(`  ✓ Turn 7b -> Confirmed phone number, resolved customer in PostgreSQL (${createdCustomerId}), prompted booking confirmation.`);

    // Turn 8: Confirmation -> MUST create appointment in PostgreSQL
    const t8 = await receptionist.processMessage({
      message: 'Yes, please confirm the appointment',
      context,
    });
    assert.strictEqual(t8.success, true);
    assert.strictEqual(t8.source, 'tool');
    assert.strictEqual(t8.toolUsed, 'create_appointment');
    assert(t8.response.includes('successfully booked'));
    assert(t8.response.includes(testName));

    const appointmentData = t8.data as any;
    assert(appointmentData?.id, 'create_appointment tool must return real appointment ID');
    createdAppointmentId = appointmentData.id;
    console.log(`  ✓ Turn 8 -> Successfully confirmed! Created Appointment ID: '${createdAppointmentId}'.`);

    // Verify database record integrity
    const savedAppointment = await prisma.appointment.findUnique({
      where: { id: createdAppointmentId! },
      include: {
        customer: true,
        staff: true,
        service: true,
      },
    });

    assert(savedAppointment, 'Appointment must be persisted in PostgreSQL');
    assert.strictEqual(savedAppointment.businessId, business.id);
    assert.strictEqual(savedAppointment.customer.name, testName);
    assert(savedAppointment.staffId, 'Staff ID must not be null');
    assert(savedAppointment.staff, 'Staff relationship must be populated');
    assert.strictEqual(savedAppointment.status, 'CONFIRMED');
    console.log('  ✓ Verified PostgreSQL record: Saved with real customer, non-null staff, and CONFIRMED status.');

    } finally {
      // Clean up created test appointment and customer
      if (createdAppointmentId) {
        await prisma.appointment.delete({
          where: { id: createdAppointmentId },
        }).catch(() => {});
        console.log(`  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
      }
      if (createdCustomerId) {
        await prisma.customer.delete({
          where: { id: createdCustomerId },
        }).catch(() => {});
        console.log(`  ✓ Cleaned up test customer '${createdCustomerId}'.`);
      }
    }
  }

  // ----------------------------------------------------
  // 3. Anti-Hallucination Guardrail Check (Deterministic)
  // ----------------------------------------------------
  console.log('\n3. Testing Anti-Hallucination Guardrail for Unconfirmed Fallback:');
  const guardrailSessionStore = new InMemorySessionStore();
  const guardrailMockModel = new MockAIModel();
  const guardrailReceptionist = new AIReceptionistService({
    toolRouter,
    aiModel: guardrailMockModel,
    sessionStore: guardrailSessionStore,
  });

  guardrailMockModel.cannedResponse = 'Your appointment has been confirmed for 3:00 PM today!';

  const hallucinationTest = await guardrailReceptionist.processMessage({
    message: 'Tell me about random stuff xyz',
    context: {
      businessId: 'test-business-id-001',
      sessionId: 'anti-hallucination-session',
      channel: 'VOICE',
    },
  });

  assert.strictEqual(hallucinationTest.success, true);
  assert.strictEqual(hallucinationTest.action, 'NONE');
  assert(
    !hallucinationTest.response.includes('has been confirmed'),
    'AI must NOT hallucinate confirmations without database execution'
  );
  assert(
    hallucinationTest.response.includes('tell me which service'),
    'AI must redirect caller to start real booking flow instead of fabricating confirmations'
  );
  console.log('  ✓ Anti-hallucination guardrail intercepted fake confirmation and guided caller properly.');
  // ----------------------------------------------------
  // 4. Deterministic Multi-Step Transitions & Zero False Confirmations
  // ----------------------------------------------------
  console.log('\n4. Testing Step Transitions & Zero False Confirmations:');

  const unitStore = new InMemorySessionStore();
  const unitStateMachine = new (await import('../modules/ai/conversation/appointment-state-machine')).AppointmentStateMachine(unitStore);

  // A. Slot Selection -> Collect Name with Specialist Auto-Assignment
  const slotSessionId = 'test-slot-session';
  const now = new Date();
  await unitStore.setSession({
    sessionId: slotSessionId,
    businessId: 'biz-001',
    step: BookingConversationStep.BOOKING_SELECT_SLOT,
    selectedServiceId: 'srv-1',
    selectedServiceName: 'Teeth Cleaning',
    selectedDate: '2026-09-10',
    availableSlots: [
      {
        timeLabel: '10:00 AM',
        startTime: '2026-09-10T10:00:00.000Z',
        endTime: '2026-09-10T10:30:00.000Z',
        staffId: 'staff-99',
        staffName: 'Dr. Emily Watson',
      },
    ],
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  const slotTurn = await unitStateMachine.handleTurn(
    '10:00 AM',
    (await unitStore.getSession(slotSessionId))!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );

  assert.strictEqual(slotTurn.response.success, true);
  assert(slotTurn.response.response.includes('May I have your full name'));
  const afterSlotSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterSlotSession?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME);
  assert.strictEqual(afterSlotSession?.selectedStaffId, 'staff-99');
  assert.strictEqual(afterSlotSession?.selectedStaffName, 'Dr. Emily Watson');
  console.log('  ✓ Verified slot selection assigned specialist "Dr. Emily Watson" and advanced to customer name collection.');

  // B. Name Collection -> Explicit Name Confirmation
  const nameTurn = await unitStateMachine.handleTurn(
    'My name is Sophia Loren',
    afterSlotSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );

  assert.strictEqual(nameTurn.response.success, true);
  assert(nameTurn.response.response.includes('your name is') && nameTurn.response.response.includes('Sophia Loren'));
  const afterNameSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterNameSession?.step, BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME);
  assert.strictEqual(afterNameSession?.customerName, 'Sophia Loren');
  console.log('  ✓ Verified name collection captured "Sophia Loren" and advanced to explicit name confirmation.');

  // B-2. Name Rejection & Discard: "No, you got it wrong" -> returns to name collection with discarded name
  const nameRejectTurn = await unitStateMachine.handleTurn(
    'No, you got it wrong',
    afterNameSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(nameRejectTurn.response.success, true);
  assert(nameRejectTurn.response.response.includes('repeat your first and last name'));
  const afterNameRejectSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterNameRejectSession?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_NAME);
  assert.strictEqual(afterNameRejectSession?.customerName, undefined, 'Previous name must be discarded on rejection');
  console.log('  ✓ Name Rejection & Discard: Discarded misheard name and returned to name collection.');

  // B-3. Name Inline Correction: "No, my name is Sophia Loren"
  const nameInlineTurn = await unitStateMachine.handleTurn(
    'No, my name is Sophia Loren',
    afterNameRejectSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(nameInlineTurn.response.success, true);
  const afterInlineSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterInlineSession?.step, BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_NAME);
  assert.strictEqual(afterInlineSession?.customerName, 'Sophia Loren');
  console.log('  ✓ Name Inline Correction: Corrected name captured and stayed in name confirmation.');

  // B-4. Confirm Name -> Advances to Phone Collection
  const nameConfirmTurn = await unitStateMachine.handleTurn(
    'Yes, that is correct',
    afterInlineSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(nameConfirmTurn.response.success, true);
  assert(nameConfirmTurn.response.response.includes('phone number'));
  const afterConfirmNameSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterConfirmNameSession?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE);
  console.log('  ✓ Name Confirmation: Confirmed name and advanced to phone collection.');

  // B-5. Phone Collection -> Explicit Phone Confirmation
  const phoneTurn = await unitStateMachine.handleTurn(
    '555 123 4567',
    afterConfirmNameSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(phoneTurn.response.success, true);
  assert(phoneTurn.response.response.includes('555-123-4567') && phoneTurn.response.response.includes('correct'));
  const afterPhoneSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterPhoneSession?.step, BookingConversationStep.BOOKING_CONFIRM_CUSTOMER_PHONE);
  assert.strictEqual(afterPhoneSession?.customerPhone, '555-123-4567');
  console.log('  ✓ Phone Collection: Formatted phone number and advanced to explicit phone confirmation.');

  // B-6. Phone Rejection & Discard: "No, that's not my number" -> returns to phone collection with discarded phone
  const phoneRejectTurn = await unitStateMachine.handleTurn(
    "No, that's not my number",
    afterPhoneSession!,
    { businessId: 'biz-001', sessionId: slotSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(phoneRejectTurn.response.success, true);
  assert(phoneRejectTurn.response.response.includes('What is your phone number'));
  const afterPhoneRejectSession = await unitStore.getSession(slotSessionId);
  assert.strictEqual(afterPhoneRejectSession?.step, BookingConversationStep.BOOKING_COLLECT_CUSTOMER_PHONE);
  assert.strictEqual(afterPhoneRejectSession?.customerPhone, undefined, 'Previous phone must be discarded on rejection');
  console.log('  ✓ Phone Rejection & Discard: Discarded misheard phone and returned to phone collection.');

  // C. Confirm Step -> Tool Error Handled with Zero False Confirmations
  const confirmSessionId = 'test-confirm-session';
  await unitStore.setSession({
    sessionId: confirmSessionId,
    businessId: 'biz-001',
    step: BookingConversationStep.BOOKING_CONFIRM,
    selectedServiceId: 'srv-1',
    selectedServiceName: 'Teeth Cleaning',
    selectedDate: '2026-09-10',
    selectedStartTime: '2026-09-10T10:00:00.000Z',
    selectedEndTime: '2026-09-10T10:30:00.000Z',
    customerId: 'cust-1',
    customerName: 'Sophia Loren',
    customerPhone: '+1-555-010-9999',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  // When confirmation receives "Yes", but tool router fails due to mock/offline DB
  const confirmTurn = await unitStateMachine.handleTurn(
    'Yes, please confirm',
    (await unitStore.getSession(confirmSessionId))!,
    { businessId: 'biz-001', sessionId: confirmSessionId, channel: 'VOICE' },
    performance.now()
  );

  // If tool failed to write to DB, success MUST be false and response MUST NOT claim booking succeeded
  assert.strictEqual(confirmTurn.response.success, false);
  assert(!confirmTurn.response.response.includes('successfully booked'));
  assert(
    confirmTurn.response.response.includes("wasn't able to complete") ||
    confirmTurn.response.response.includes("Could not complete") ||
    confirmTurn.response.response.includes("scheduling conflict")
  );
  console.log('  ✓ Zero False Confirmations Guarantee: When tool creation fails, AI reports conflict and never claims booking.');

  // ----------------------------------------------------
  // 5. Universal User Correction Routing & State Rollback
  // ----------------------------------------------------
  console.log('\n5. Testing Universal User Correction Routing:');

  const correctionSessionId = 'test-correction-session';
  await unitStore.setSession({
    sessionId: correctionSessionId,
    businessId: 'biz-001',
    step: BookingConversationStep.BOOKING_SELECT_SLOT,
    selectedServiceId: 'srv-1',
    selectedServiceName: 'Comprehensive Oral Exam',
    selectedDate: '2026-09-15',
    availableSlots: [
      { timeLabel: '09:00 AM', startTime: '2026-09-15T09:00:00.000Z', endTime: '2026-09-15T09:30:00.000Z' },
    ],
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  // User says "Can I change the date?"
  const dateCorrectionTurn = await unitStateMachine.handleTurn(
    'Can I change the date?',
    (await unitStore.getSession(correctionSessionId))!,
    { businessId: 'biz-001', sessionId: correctionSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(dateCorrectionTurn.response.success, true);
  assert(dateCorrectionTurn.response.response.includes('pick a different date') || dateCorrectionTurn.response.response.includes('What date'));
  const afterDateCorrectionSession = await unitStore.getSession(correctionSessionId);
  assert.strictEqual(afterDateCorrectionSession?.step, BookingConversationStep.BOOKING_COLLECT_DATE);
  assert.strictEqual(afterDateCorrectionSession?.selectedDate, undefined);
  console.log('  ✓ Universal Correction: "Can I change the date?" safely rolled back to date collection.');

  // User says "Can I change the service?"
  const serviceCorrectionTurn = await unitStateMachine.handleTurn(
    'Wait, can I change the service?',
    afterDateCorrectionSession!,
    { businessId: 'biz-001', sessionId: correctionSessionId, channel: 'VOICE' },
    performance.now()
  );
  assert.strictEqual(serviceCorrectionTurn.response.success, true);
  assert(serviceCorrectionTurn.response.response.includes('select a different service') || serviceCorrectionTurn.response.response.includes('Which service'));
  const afterServiceCorrectionSession = await unitStore.getSession(correctionSessionId);
  assert.strictEqual(afterServiceCorrectionSession?.step, BookingConversationStep.BOOKING_COLLECT_SERVICE);
  console.log('  ✓ Universal Correction: "Change service" safely rolled back to service selection.');

  // ----------------------------------------------------
  // 6. Typed Input Turn Transport Bypass
  // ----------------------------------------------------
  console.log('\n6. Testing Typed Input Turn Transport Layer:');
  const { voiceTurnTransportService } = await import('../modules/speech/transport/services/voice-turn-transport.service');
  const typedTurnBusiness = await prisma.business.findFirst();

  if (typedTurnBusiness) {
    const textTurnResult = await voiceTurnTransportService.processVoiceTurn({
      businessId: typedTurnBusiness.id,
      textInput: 'I would like to book a consultation',
      clientChannel: 'MOBILE_WEB',
    });

    assert.strictEqual(textTurnResult.success, true);
    assert.strictEqual(textTurnResult.transcript, 'I would like to book a consultation');
    assert(textTurnResult.responseText.length > 0);
    assert.strictEqual(textTurnResult.metrics.sttMs, 0, 'Typed input must completely bypass STT latency (0ms)');
    assert(textTurnResult.audio, 'Typed turn should still synthesize TTS response audio');
    console.log(`  ✓ Typed Turn Transport: Bypassed STT, processed conversational turn, and synthesized audio in ${textTurnResult.metrics.totalMs}ms.`);
  }

}

if (require.main === module) {
  runVoiceAppointmentPersistenceTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
