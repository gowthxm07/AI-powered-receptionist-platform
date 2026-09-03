import assert from 'assert';
import { prisma } from '../lib/prisma';
import { VoiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runVoiceTransportTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Voice Transport & Streaming Tests ---');
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
  assert(otherBusiness, 'Second business must exist for tenant security tests.');

  // Fetch demo customer
  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(customer, 'Demo customer must exist.');

  // ---------------------------------------------------------
  // TEST GROUP 1: Transport Session Lifecycle
  // ---------------------------------------------------------
  console.log('\n1. Testing Voice Transport Session Lifecycle:');
  const sessionManager = new VoiceTransportSessionManager();

  // Create new session
  const createRes = await sessionManager.createTransportSession({
    businessId: business.id,
    customerId: customer.id,
    channel: 'MOBILE_WEB',
    clientMetadata: { deviceType: 'Mobile Safari', userAgent: 'iOS 17.5' },
  });

  assert.strictEqual(createRes.success, true);
  assert(createRes.session);
  assert(createRes.session.transportSessionId.startsWith('vtr_'));
  assert(createRes.session.conversationSessionId.startsWith('sess_voice_'));
  assert.strictEqual(createRes.session.businessId, business.id);
  assert.strictEqual(createRes.session.customerId, customer.id);
  assert.strictEqual(createRes.session.customerName, customer.name);
  assert.strictEqual(createRes.session.state, 'READY');
  assert.strictEqual(createRes.session.turnCount, 0);
  console.log(`  ✓ Created voice transport session '${createRes.session.transportSessionId}' mapped to '${createRes.session.conversationSessionId}'.`);

  // Retrieve session
  const retrieved = await sessionManager.getTransportSession(createRes.session.transportSessionId);
  assert(retrieved);
  assert.strictEqual(retrieved.transportSessionId, createRes.session.transportSessionId);
  console.log('  ✓ Retrieved active transport session successfully.');

  // Update session state
  const updated = await sessionManager.updateTransportSession(createRes.session.transportSessionId, {
    state: 'PROCESSING_TURN',
  });
  assert(updated);
  assert.strictEqual(updated.state, 'PROCESSING_TURN');
  console.log('  ✓ Updated transport session state to PROCESSING_TURN.');

  // Record turn
  const afterTurn = await sessionManager.recordTurn(createRes.session.transportSessionId, 'READY');
  assert(afterTurn);
  assert.strictEqual(afterTurn.turnCount, 1);
  assert.strictEqual(afterTurn.state, 'READY');
  console.log('  ✓ Recorded turn count increment to 1.');

  // Terminate session
  const termRes = await sessionManager.terminateTransportSession(createRes.session.transportSessionId);
  assert.strictEqual(termRes, true);
  const afterTerm = await sessionManager.getTransportSession(createRes.session.transportSessionId);
  assert.strictEqual(afterTerm, null);
  console.log('  ✓ Terminated and cleaned up transport session.');

  // ---------------------------------------------------------
  // TEST GROUP 2: Transport Audio Turn Processing & Latency
  // ---------------------------------------------------------
  console.log('\n2. Testing Voice Turn Transport & Latency Breakdown:');
  const mockSTT = new MockSTTProvider({ transcript: 'Hello there!' });
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });
  const transportService = new VoiceTurnTransportService({
    sessionManager,
    orchestrator,
  });

  const turn1 = await transportService.processVoiceTurn({
    businessId: business.id,
    customerId: customer.id,
    audioFilePath: 'dummy_turn.wav',
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(turn1.success, true);
  assert(turn1.transportSessionId.startsWith('vtr_'));
  assert(turn1.conversationSessionId.startsWith('sess_voice_'));
  assert.strictEqual(turn1.source, 'deterministic');
  assert(turn1.audio !== null);
  assert(turn1.audio.url.startsWith('/api/ai/voice/audio/'));
  assert(turn1.metrics.transportOverheadMs >= 0);
  assert(turn1.metrics.audioValidationMs >= 0);
  assert(turn1.metrics.sttMs >= 0);
  assert(turn1.metrics.conversationMs >= 0);
  assert(turn1.metrics.ttsMs >= 0);
  assert(turn1.metrics.totalMs >= 0);
  console.log(`  ✓ Turn processed: Overhead=${turn1.metrics.transportOverheadMs}ms, STT=${turn1.metrics.sttMs}ms, Conv=${turn1.metrics.conversationMs}ms, TTS=${turn1.metrics.ttsMs}ms, Total=${turn1.metrics.totalMs}ms`);

  // ---------------------------------------------------------
  // TEST GROUP 3: Multi-Turn Voice Booking with Transport Session
  // ---------------------------------------------------------
  console.log('\n3. Testing Multi-Turn Booking via Voice Transport Layer:');
  let createdAppointmentId: string | null = null;
  const transportSessionId = turn1.transportSessionId;

  try {
    // Turn 1: Initiation
    mockSTT.setTranscript('I want to book an appointment.');
    const b1 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b1.success, true);
    assert.strictEqual(b1.transportSessionId, transportSessionId);

    // Turn 2: Service Selection
    mockSTT.setTranscript('Comprehensive Oral Exam & Digital X-Rays');
    const b2 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b2.success, true);
    assert.strictEqual(b2.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_STAFF);

    // Turn 3: Staff Preference
    mockSTT.setTranscript('Anyone is fine');
    const b3 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b3.success, true);
    assert.strictEqual(b3.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_DATE);

    // Turn 4: Date Preference
    mockSTT.setTranscript('Tomorrow');
    const b4 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b4.success, true);
    assert.strictEqual(b4.metadata?.conversationStep, BookingConversationStep.BOOKING_SELECT_SLOT);

    // Turn 5: Time Slot Selection
    mockSTT.setTranscript('09:00 AM');
    const b5 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b5.success, true);
    assert.strictEqual(b5.metadata?.conversationStep, BookingConversationStep.BOOKING_CONFIRM);

    // Turn 6: Confirm Booking
    mockSTT.setTranscript('Yes, please confirm my booking');
    const b6 = await transportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer.id,
      audioFilePath: 'dummy.wav',
    });
    assert.strictEqual(b6.success, true);
    assert.strictEqual(b6.source, 'tool');
    assert(b6.responseText.toLowerCase().includes('confirmed') || b6.responseText.toLowerCase().includes('successfully booked'));

    const appt = await prisma.appointment.findFirst({
      where: { customerId: customer.id, businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(appt, 'Appointment must be created in PostgreSQL.');
    createdAppointmentId = appt.id;

    const finalSession = await sessionManager.getTransportSession(transportSessionId);
    assert(finalSession);
    assert(finalSession.turnCount >= 6);
    console.log(`  ✓ 6-Turn Voice Booking Completed: Appointment '${createdAppointmentId}' created via transport session '${transportSessionId}'.`);
  } finally {
    if (createdAppointmentId) {
      await prisma.appointment.delete({ where: { id: createdAppointmentId } }).catch(() => {});
      console.log(`  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
    }
  }

  // ---------------------------------------------------------
  // TEST GROUP 4: Multi-Tenant Security & Isolation
  // ---------------------------------------------------------
  console.log('\n4. Testing Multi-Tenant Security & Isolation:');

  // Cross-business session reuse attempt
  const crossBizRes = await transportService.processVoiceTurn({
    transportSessionId,
    businessId: otherBusiness.id,
    audioFilePath: 'dummy.wav',
  });
  assert.strictEqual(crossBizRes.success, false);
  assert.strictEqual(crossBizRes.error?.code, 'SESSION_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant session hijacking cleanly blocked with SESSION_BUSINESS_MISMATCH (403).');

  // Invalid customer business mismatch
  const crossCustRes = await sessionManager.createTransportSession({
    businessId: otherBusiness.id,
    customerId: customer.id, // belongs to business 1
  });
  assert.strictEqual(crossCustRes.success, false);
  assert.strictEqual(crossCustRes.error?.code, 'INVALID_CUSTOMER_BUSINESS_MISMATCH');
  console.log('  ✓ Cross-tenant customer binding cleanly rejected.');

  // Unknown business
  const fakeBizRes = await sessionManager.createTransportSession({
    businessId: '00000000-0000-0000-0000-000000000000',
  });
  assert.strictEqual(fakeBizRes.success, false);
  assert.strictEqual(fakeBizRes.error?.code, 'BUSINESS_NOT_FOUND');
  console.log('  ✓ Non-existent business ID cleanly rejected with BUSINESS_NOT_FOUND (404).');

  // ---------------------------------------------------------
  // TEST GROUP 5: Payload Validation & Failure Recovery
  // ---------------------------------------------------------
  console.log('\n5. Testing Payload Validation & Error Recovery:');

  // Missing audio payload
  const missingAudioRes = await transportService.processVoiceTurn({
    businessId: business.id,
    audioFilePath: '',
  });
  assert.strictEqual(missingAudioRes.success, false);
  assert.strictEqual(missingAudioRes.error?.code, 'MISSING_AUDIO_PAYLOAD');
  console.log('  ✓ Missing audio payload rejected with MISSING_AUDIO_PAYLOAD.');

  // STT Failure
  mockSTT.setShouldFail(true);
  const sttFailRes = await transportService.processVoiceTurn({
    businessId: business.id,
    audioFilePath: 'dummy.wav',
  });
  assert.strictEqual(sttFailRes.success, false);
  assert.strictEqual(sttFailRes.error?.code, 'STT_PROCESSING_FAILED');
  console.log('  ✓ STT failure handled cleanly without crashing transport.');

  // TTS Failure (preserves text)
  mockSTT.setShouldFail(false);
  mockSTT.setTranscript('Hello there!');
  mockTTS.setShouldFail(true);
  const ttsFailRes = await transportService.processVoiceTurn({
    businessId: business.id,
    audioFilePath: 'dummy.wav',
  });
  assert.strictEqual(ttsFailRes.success, true);
  assert(ttsFailRes.responseText.length > 0);
  assert.strictEqual(ttsFailRes.audio, null);
  console.log('  ✓ TTS failure preserved text response without losing transport session.');

  console.log('\n======================================================');
  console.log('🎉 ALL VOICE TRANSPORT TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
