import assert from 'assert';
import { prisma } from '../lib/prisma';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runVoiceOrchestratorTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Interactive Voice Orchestrator Tests ---');
  console.log('======================================================');

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist.');

  const otherBusiness = await prisma.business.findFirst({
    where: { NOT: { id: business.id } },
    select: { id: true, name: true },
  });
  assert(otherBusiness, 'Second business must exist for tenant boundary tests.');

  // Fetch demo customer
  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(customer, 'Demo customer must exist.');

  // ---------------------------------------------------------
  // TEST GROUP 1: Stage Latency & Voice Normalization
  // ---------------------------------------------------------
  console.log('\n1. Testing Voice Normalization & Stage Latency Instrumentation:');
  const mockSTT = new MockSTTProvider({ transcript: 'Hello there!' });
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });

  const rawMarkdown = '**Welcome** to *Lumina Dental*!\n- Service A\n- Service B';
  const normalized = orchestrator.normalizeVoiceResponse(rawMarkdown);
  assert.strictEqual(normalized, 'Welcome to Lumina Dental! Service A Service B');
  console.log('  ✓ Markdown and bullet points normalized for natural voice synthesis.');

  const res1 = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy_audio.wav',
    businessId: business.id,
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.source, 'deterministic');
  assert(res1.metrics.audioInputProcessingMs >= 0);
  assert(res1.metrics.sttLatencyMs >= 0);
  assert(res1.metrics.conversationLatencyMs >= 0);
  assert(res1.metrics.ttsLatencyMs >= 0);
  assert(res1.metrics.totalPipelineLatencyMs >= 0);
  console.log(`  ✓ Stage metrics verified: Input=${res1.metrics.audioInputProcessingMs}ms, STT=${res1.metrics.sttLatencyMs}ms, Conv=${res1.metrics.conversationLatencyMs}ms, TTS=${res1.metrics.ttsLatencyMs}ms, Total=${res1.metrics.totalPipelineLatencyMs}ms`);

  // ---------------------------------------------------------
  // TEST GROUP 2: Interactive Session Continuity
  // ---------------------------------------------------------
  console.log('\n2. Testing Multi-Turn Session Continuity:');
  const initialSessionId = res1.sessionId;

  mockSTT.setTranscript('What services do you offer?');
  const res2 = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy_audio.wav',
    businessId: business.id,
    sessionId: initialSessionId,
  });

  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.sessionId, initialSessionId, 'Session ID must be preserved across turns.');
  assert.strictEqual(res2.source, 'tool');
  console.log(`  ✓ Preserved session ID '${res2.sessionId}' across consecutive voice turns.`);

  // ---------------------------------------------------------
  // TEST GROUP 3: Multi-Turn Voice Booking Workflow
  // ---------------------------------------------------------
  console.log('\n3. Testing End-to-End Multi-Turn Voice Booking Flow:');
  let createdAppointmentId: string | null = null;

  try {
    // Turn 1: Initiation
    mockSTT.setTranscript('I want to book an appointment.');
    const b1 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      customerId: customer.id,
    });
    assert.strictEqual(b1.success, true);
    assert.strictEqual(b1.source, 'deterministic');
    const bookingSessionId = b1.sessionId;

    // Turn 2: Service Selection
    mockSTT.setTranscript('Comprehensive Oral Exam & Digital X-Rays');
    const b2 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bookingSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(b2.success, true);
    assert.strictEqual(b2.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_STAFF);

    // Turn 3: Staff Selection
    mockSTT.setTranscript('Anyone is fine');
    const b3 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bookingSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(b3.success, true);
    assert.strictEqual(b3.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_DATE);

    // Turn 4: Date Selection
    mockSTT.setTranscript('Tomorrow');
    const b4 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bookingSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(b4.success, true);
    assert.strictEqual(b4.metadata?.conversationStep, BookingConversationStep.BOOKING_SELECT_SLOT);

    // Turn 5: Time Slot Selection
    mockSTT.setTranscript('09:00 AM');
    const b5 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bookingSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(b5.success, true);
    assert.strictEqual(b5.metadata?.conversationStep, BookingConversationStep.BOOKING_CONFIRM);

    // Turn 6: Confirmation
    mockSTT.setTranscript('Yes, please confirm my booking');
    const b6 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bookingSessionId,
      customerId: customer.id,
    });
    assert.strictEqual(b6.success, true);
    assert.strictEqual(b6.source, 'tool');
    assert(b6.response.toLowerCase().includes('confirmed') || b6.response.toLowerCase().includes('successfully booked'));

    const appt = await prisma.appointment.findFirst({
      where: { customerId: customer.id, businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(appt, 'Appointment must be created in PostgreSQL.');
    createdAppointmentId = appt.id;
    console.log(`  ✓ 6-Turn Voice Booking Completed: Appointment '${createdAppointmentId}' created in PostgreSQL.`);
  } finally {
    if (createdAppointmentId) {
      await prisma.appointment.delete({ where: { id: createdAppointmentId } }).catch(() => {});
      console.log(`  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
    }
  }

  // ---------------------------------------------------------
  // TEST GROUP 4: Mid-Flow Informational Interruptions
  // ---------------------------------------------------------
  console.log('\n4. Testing Mid-Flow Informational Interruptions:');
  mockSTT.setTranscript('I want to book an appointment.');
  const flow1 = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    customerId: customer.id,
  });
  const flowSessionId = flow1.sessionId;

  // Select service
  mockSTT.setTranscript('Comprehensive Oral Exam & Digital X-Rays');
  const flow2 = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    sessionId: flowSessionId,
    customerId: customer.id,
  });
  assert.strictEqual(flow2.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_STAFF);

  // Interruption: Ask for general services catalog
  mockSTT.setTranscript('What services do you offer?');
  const interruptionRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    sessionId: flowSessionId,
    customerId: customer.id,
  });
  assert.strictEqual(interruptionRes.success, true);
  assert.strictEqual(interruptionRes.source, 'tool');
  assert(interruptionRes.response.includes('We offer') || interruptionRes.response.includes('Continuing with your booking'));

  // Resume booking: Provide staff
  mockSTT.setTranscript('Anyone is fine');
  const flow3 = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    sessionId: flowSessionId,
    customerId: customer.id,
  });
  assert.strictEqual(flow3.success, true);
  assert.strictEqual(flow3.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_DATE);
  console.log('  ✓ Mid-flow service inquiry answered without losing booking state machine progress.');

  // ---------------------------------------------------------
  // TEST GROUP 5: Customer Identification & Tenant Isolation
  // ---------------------------------------------------------
  console.log('\n5. Testing Customer Identification & Tenant Security:');

  // Customer ID binding
  mockSTT.setTranscript('Hi');
  const custRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    customerId: customer.id,
  });
  assert.strictEqual(custRes.success, true);
  const sessionData = await sessionStore.getSession(custRes.sessionId);
  assert.strictEqual(sessionData?.customerId, customer.id);
  assert.strictEqual(sessionData?.customerName, customer.name);
  console.log(`  ✓ Verified caller identified as '${customer.name}' with phone '${customer.phone}'.`);

  // Cross-tenant customer injection rejection
  const crossCust = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: otherBusiness.id,
    customerId: customer.id, // belongs to business 1
  });
  assert.strictEqual(crossCust.success, false);
  assert.strictEqual(crossCust.error?.code, 'INVALID_CUSTOMER_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant customer parameter injection cleanly rejected with 400.');

  // Cross-tenant session hijacking rejection
  const crossSession = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: otherBusiness.id,
    sessionId: custRes.sessionId,
  });
  assert.strictEqual(crossSession.success, false);
  assert.strictEqual(crossSession.error?.code, 'SESSION_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant session hijacking cleanly blocked with 403.');

  // ---------------------------------------------------------
  // TEST GROUP 6: Error Recovery & Graceful Degradation
  // ---------------------------------------------------------
  console.log('\n6. Testing Error Recovery & Failure Handlers:');

  // STT Failure
  mockSTT.setShouldFail(true);
  const sttFailRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
  });
  assert.strictEqual(sttFailRes.success, false);
  assert.strictEqual(sttFailRes.error?.code, 'STT_PROCESSING_FAILED');
  assert.strictEqual(sttFailRes.metrics.conversationLatencyMs, 0, 'No conversation engine calls on STT failure.');
  assert.strictEqual(sttFailRes.metrics.ttsLatencyMs, 0, 'No TTS calls on STT failure.');
  console.log('  ✓ STT failure handled cleanly without invoking conversation engine.');

  // Empty Transcription Handling (Clarification Prompt)
  mockSTT.setShouldFail(false);
  mockSTT.setTranscript('');
  const emptyRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
  });
  assert.strictEqual(emptyRes.success, true);
  assert.strictEqual(emptyRes.action, 'PROMPT_CLARIFICATION');
  assert(emptyRes.response.includes("didn't catch that"));
  assert.strictEqual(emptyRes.metrics.conversationLatencyMs, 0, 'Zero LLM calls on empty transcription.');
  console.log('  ✓ Empty transcription returned clarification prompt with 0 LLM calls.');

  // TTS Failure (Preserves text response)
  mockSTT.setTranscript('What time are you open?');
  mockTTS.setShouldFail(true);
  const ttsFailRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
  });
  assert.strictEqual(ttsFailRes.success, true);
  assert(ttsFailRes.response.length > 0);
  assert.strictEqual(ttsFailRes.audio, null);
  console.log('  ✓ TTS failure preserved conversation text without crashing session.');

  console.log('\n======================================================');
  console.log('🎉 ALL VOICE CONVERSATION ORCHESTRATOR TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
