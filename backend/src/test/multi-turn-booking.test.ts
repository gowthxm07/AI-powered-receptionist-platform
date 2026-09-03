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

class MockAIModel implements AIModel {
  public readonly name: string = 'MockAIModel';
  public readonly modelId: string = 'mock-llama';
  public generateCallCount: number = 0;

  public async generate(request: AIModelRequest): Promise<AIModelResponse> {
    this.generateCallCount++;
    return {
      text: 'Mock LLM answer',
      model: this.modelId,
      metrics: { totalDurationMs: 50 },
      success: true,
    };
  }

  public async *generateStream(request: AIModelRequest): AsyncIterable<AIModelStreamChunk> {
    yield { type: 'text', text: 'Mock LLM answer' };
    yield { type: 'done' };
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }
}

export async function runMultiTurnBookingTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Multi-Turn Appointment Booking Tests ---');
  console.log('======================================================');

  // Find demo business and customer
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
  });
  assert(business, 'Demo business must exist in database');

  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
  });
  assert(customer, 'Demo customer must exist in database');

  const sessionStore = new InMemorySessionStore();
  const mockModel = new MockAIModel();
  const receptionist = new AIReceptionistService({
    toolRouter,
    aiModel: mockModel,
    sessionStore,
  });

  const context: AIConversationContext = {
    businessId: business.id,
    sessionId: 'multi-turn-test-session-1',
    customerId: customer.id,
    channel: 'WEB',
    metadata: {
      businessName: business.name,
    },
  };

  let createdAppointmentId: string | null = null;

  try {
    // ----------------------------------------------------
    // 1. Complete End-to-End 6-Turn Booking Flow
    // ----------------------------------------------------
    console.log('\n1. Testing Complete End-to-End 6-Turn Booking Conversation:');
    mockModel.generateCallCount = 0;

    // Turn 1: Inbound booking intent
    const t1 = await receptionist.processMessage({
      message: 'I want to book an appointment',
      context,
    });
    assert.strictEqual(t1.success, true);
    assert.strictEqual(t1.intent, AIIntent.BOOK_APPOINTMENT);
    assert.strictEqual(t1.source, 'deterministic');
    assert(t1.response.includes('Which service'), 'Turn 1 should prompt for service');
    const s1 = await sessionStore.getSession(context.sessionId);
    assert.strictEqual(s1?.step, BookingConversationStep.BOOKING_COLLECT_SERVICE);
    console.log('  ✓ Turn 1 (Intent) -> Prompted for service.');

    // Turn 2: Service Selection (Real DB service)
    const t2 = await receptionist.processMessage({
      message: 'Comprehensive Oral Exam',
      context,
    });
    assert.strictEqual(t2.success, true);
    assert(t2.response.includes('preferred specialist'), 'Turn 2 should prompt for staff');
    const s2 = await sessionStore.getSession(context.sessionId);
    assert.strictEqual(s2?.step, BookingConversationStep.BOOKING_COLLECT_STAFF);
    assert(s2?.selectedServiceId, 'Service ID should be captured');
    console.log(`  ✓ Turn 2 (Service) -> Matched '${s2.selectedServiceName}'.`);

    // Turn 3: Staff Selection ("Anyone")
    const t3 = await receptionist.processMessage({
      message: 'Anyone is fine',
      context,
    });
    assert.strictEqual(t3.success, true);
    assert(t3.response.includes('What date'), 'Turn 3 should prompt for date');
    const s3 = await sessionStore.getSession(context.sessionId);
    assert.strictEqual(s3?.step, BookingConversationStep.BOOKING_COLLECT_DATE);
    assert.strictEqual(s3?.selectedStaffId, null);
    console.log('  ✓ Turn 3 (Staff) -> Stored "anyone" preference.');

    // Turn 4: Date Selection ("Tomorrow")
    const t4 = await receptionist.processMessage({
      message: 'Tomorrow',
      context,
    });
    assert.strictEqual(t4.success, true);
    assert(t4.response.includes('Available times'), 'Turn 4 should list available times');
    const s4 = await sessionStore.getSession(context.sessionId);
    assert.strictEqual(s4?.step, BookingConversationStep.BOOKING_SELECT_SLOT);
    assert(s4?.availableSlots && s4.availableSlots.length > 0, 'Should find open slots');
    console.log(`  ✓ Turn 4 (Date) -> Discovered ${s4.availableSlots.length} open slots from PostgreSQL.`);

    // Turn 5: Time Slot Selection
    const selectedSlot = s4.availableSlots[0];
    const t5 = await receptionist.processMessage({
      message: selectedSlot.timeLabel,
      context,
    });
    assert.strictEqual(t5.success, true);
    assert(t5.response.includes('Please confirm'), 'Turn 5 should ask for confirmation');
    const s5 = await sessionStore.getSession(context.sessionId);
    assert.strictEqual(s5?.step, BookingConversationStep.BOOKING_CONFIRM);
    console.log(`  ✓ Turn 5 (Slot) -> Selected ${selectedSlot.timeLabel} and prompted confirmation.`);

    // Turn 6: Confirmation ("Yes, book it")
    const t6 = await receptionist.processMessage({
      message: 'Yes, please book it',
      context,
    });
    assert.strictEqual(t6.success, true);
    assert.strictEqual(t6.source, 'tool');
    assert.strictEqual(t6.toolUsed, 'create_appointment');
    assert(t6.response.includes('successfully booked'), 'Turn 6 should confirm creation');

    const createdData = t6.data as any;
    assert(createdData?.id, 'Should return created appointment ID');
    createdAppointmentId = createdData.id;

    // Verify appointment in PostgreSQL
    const dbAppointment = await prisma.appointment.findUnique({
      where: { id: createdAppointmentId! },
    });
    assert(dbAppointment, 'Appointment must exist in PostgreSQL database');
    assert.strictEqual(dbAppointment.businessId, business.id);
    assert.strictEqual(dbAppointment.customerId, customer.id);
    console.log(`  ✓ Turn 6 (Confirm) -> Created Appointment '${createdAppointmentId}' in PostgreSQL.`);

    // Assert ZERO LLM calls occurred during normal booking flow
    assert.strictEqual(mockModel.generateCallCount, 0, 'Booking flow MUST NOT make any LLM calls');
    console.log('  ✓ 100% Deterministic Low-Latency Execution: 0 calls to MockAIModel.');

    // ----------------------------------------------------
    // 2. Interruption Handling
    // ----------------------------------------------------
    console.log('\n2. Testing Mid-Flow Interruptions and Inquiries:');
    const interruptSessionId = 'session-interruption-test';
    const interruptContext = { ...context, sessionId: interruptSessionId };

    // Start booking
    await receptionist.processMessage({ message: 'I want to book an appointment', context: interruptContext });
    await receptionist.processMessage({ message: 'Comprehensive Oral Exam', context: interruptContext });
    await receptionist.processMessage({ message: 'Anyone', context: interruptContext });

    // Mid-flow question: "What services do you offer?"
    const srvInterruptRes = await receptionist.processMessage({
      message: 'What services do you offer?',
      context: interruptContext,
    });
    assert.strictEqual(srvInterruptRes.success, true);
    assert.strictEqual(srvInterruptRes.source, 'tool');
    assert(srvInterruptRes.response.includes('We offer'), 'Should answer service question');
    assert(srvInterruptRes.response.includes('Continuing with your booking'), 'Should prompt to continue flow');

    // Cancellation: "Never mind"
    const cancelRes = await receptionist.processMessage({
      message: 'Never mind',
      context: interruptContext,
    });
    assert.strictEqual(cancelRes.success, true);
    assert(cancelRes.response.includes('cancelled your booking'), 'Should cancel session cleanly');
    const checkCancelled = await sessionStore.getSession(interruptSessionId);
    assert.strictEqual(checkCancelled, null, 'Cancelled session must be purged');
    console.log('  ✓ Informational inquiries and clean cancellations handled safely.');

    // ----------------------------------------------------
    // 3. Multi-Session Isolation
    // ----------------------------------------------------
    console.log('\n3. Testing Concurrent Multi-Session Isolation:');
    const sessionAContext = { ...context, sessionId: 'session-alpha' };
    const sessionBContext = { ...context, sessionId: 'session-beta' };

    await receptionist.processMessage({ message: 'I want to book an appointment', context: sessionAContext });
    await receptionist.processMessage({ message: 'I want to book an appointment', context: sessionBContext });

    await receptionist.processMessage({ message: 'Comprehensive Oral Exam', context: sessionAContext });
    await receptionist.processMessage({ message: 'Laser Enamel Whitening', context: sessionBContext });

    const sessA = await sessionStore.getSession('session-alpha');
    const sessB = await sessionStore.getSession('session-beta');
    assert(sessA && sessB);
    assert(sessA.selectedServiceName?.includes('Oral Exam'));
    assert(sessB.selectedServiceName?.includes('Whitening'));
    console.log('  ✓ Simultaneous sessions maintained distinct state without data leakage.');

  } finally {
    // Clean up dedicated test appointment if created
    if (createdAppointmentId) {
      await prisma.appointment.delete({
        where: { id: createdAppointmentId },
      }).catch(() => {});
      console.log(`\n  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ALL MULTI-TURN APPOINTMENT BOOKING TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
