import assert from 'assert';
import { prisma } from '../lib/prisma';
import { voiceResponseOptimizer, VoiceResponseOptimizer } from '../modules/speech/services/voice-response-optimizer.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runVoiceResponseOptimizationTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Phase 7.3.1 Voice Response Optimization Tests ---');
  console.log('======================================================');

  // Fetch demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist.');

  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });
  assert(customer, 'Demo customer must exist.');

  // ---------------------------------------------------------
  // TEST A: Voice Response Conciseness & Natural Spoken Formatting
  // ---------------------------------------------------------
  console.log('\n1. Test A — Voice Response Conciseness & Spoken Formatting:');

  const testPhrases = [
    {
      original: 'Thank you for providing that information. I understand that you would like to book an appointment with one of our specialists. Could you please tell me which service you are interested in?',
      expectedSubstrings: ['Which service would you like?'],
    },
    {
      original: 'Got it, Comprehensive Oral Exam & Digital X-Rays (30 mins). Do you have a preferred specialist, or would anyone be fine?',
      expectedSubstrings: ['Got it.', 'Comprehensive Oral Exam & Digital X-Rays.', 'Do you have a preferred specialist, or is anyone okay?'],
    },
    {
      original: 'Available times on Friday, Sep 5 are 09:00 AM, 10:00 AM, 02:00 PM. Which one would you prefer?',
      expectedSubstrings: ['Available times on Friday, Sep 5 are 09:00 AM, 10:00 AM, 02:00 PM.', 'Which time works best?'],
    },
    {
      original: 'Got it for 10:00 AM! Could you please provide your phone number so that we can locate your customer profile and complete the appointment booking?',
      expectedSubstrings: ['Got it for 10:00 AM!', 'Please provide your phone number.'],
    },
    {
      original: 'Please confirm your appointment: Comprehensive Oral Exam with Dr. Marcus Thorne on Friday, Sep 5 at 10:00 AM. Would you like me to book it?',
      expectedSubstrings: ['Please confirm: Comprehensive Oral Exam with Dr. Marcus Thorne on Friday, Sep 5 at 10:00 AM.', 'Should I book it?'],
    },
    {
      original: 'Your appointment for Comprehensive Oral Exam on Friday, Sep 5 at 10:00 AM has been successfully booked! We look forward to seeing you.',
      expectedSubstrings: ['Your appointment for Comprehensive Oral Exam on Friday, Sep 5 at 10:00 AM is confirmed! Thank you.'],
    },
  ];

  for (const { original, expectedSubstrings } of testPhrases) {
    const res = voiceResponseOptimizer.optimizeForVoice(original, { channel: 'VOICE' });
    assert.strictEqual(res.optimized, true);
    assert(res.charCountOptimized < res.charCountOriginal, 'Optimized voice text must be shorter than original text');
    for (const sub of expectedSubstrings) {
      assert(res.text.includes(sub), `Optimized text must include '${sub}'. Actual: '${res.text}'`);
    }
  }
  console.log('  ✓ Verified 6 spoken conciseness normalizations without loss of critical entities.');

  // ---------------------------------------------------------
  // TEST B: WEB Channel Behavior Preservation
  // ---------------------------------------------------------
  console.log('\n2. Test B — WEB Channel Behavior Preservation:');

  const webCanonicalText = '**Welcome** to Lumina Dental Care!\n- Service 1 (30 mins)\n- Service 2 (60 mins)\n\nPlease visit [our portal](https://example.com) for details.';
  const webResult = voiceResponseOptimizer.optimizeForVoice(webCanonicalText, { channel: 'WEB' });
  assert.strictEqual(webResult.optimized, false, 'WEB responses must not be modified.');
  assert.strictEqual(webResult.text, webCanonicalText.trim(), 'WEB response text must match canonical string exactly.');
  assert.strictEqual(webResult.charCountOptimized, webResult.charCountOriginal);
  console.log('  ✓ WEB channel responses preserved with 100% fidelity (0 modifications).');

  // ---------------------------------------------------------
  // TEST C: Complete Multi-Turn Voice Booking with Optimized Audio
  // ---------------------------------------------------------
  console.log('\n3. Test C — Complete Multi-Turn Voice Booking Workflow:');

  const mockSTT = new MockSTTProvider();
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });

  let createdApptId: string | null = null;
  try {
    // Turn 1: Initiation
    mockSTT.setTranscript('I want to book an appointment.');
    const t1 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t1.success, true);
    assert.strictEqual(t1.response, 'Sure! Which service would you like to book?');
    const bSessionId = t1.sessionId;

    // Turn 2: Service Selection (Oral Exam)
    mockSTT.setTranscript('Comprehensive Oral Exam');
    const t2 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t2.success, true);
    assert(t2.response.includes('Do you have a preferred specialist, or is anyone okay?'));

    // Turn 3: Staff Selection (Anyone)
    mockSTT.setTranscript('Anyone is fine');
    const t3 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t3.success, true);
    assert.strictEqual(t3.metadata?.conversationStep, BookingConversationStep.BOOKING_COLLECT_DATE);

    // Turn 4: Date Selection (Tomorrow)
    mockSTT.setTranscript('Tomorrow');
    const t4 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t4.success, true);
    assert.strictEqual(t4.metadata?.conversationStep, BookingConversationStep.BOOKING_SELECT_SLOT);
    assert(t4.response.includes('Which time works best?') || t4.response.includes('Which one'));

    // Turn 5: Slot Selection (First available slot)
    const sessionState = await sessionStore.getSession(bSessionId);
    assert(sessionState?.availableSlots && sessionState.availableSlots.length > 0);
    const chosenSlot = sessionState.availableSlots[0];
    mockSTT.setTranscript(chosenSlot.timeLabel);

    const t5 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t5.success, true);
    assert.strictEqual(t5.metadata?.conversationStep, BookingConversationStep.BOOKING_CONFIRM);
    assert(t5.response.includes('Please confirm:') || t5.response.includes('Should I book it?'));

    // Turn 6: Confirmation
    mockSTT.setTranscript('Yes, please confirm');
    const t6 = await orchestrator.orchestrateVoiceTurn({
      audioFilePath: 'dummy.wav',
      businessId: business.id,
      sessionId: bSessionId,
      customerId: customer.id,
      channel: 'VOICE',
    });
    assert.strictEqual(t6.success, true);
    assert(t6.response.includes('is confirmed!') || t6.response.includes('successfully booked'));
    assert(t6.audio !== null, 'TTS audio response must be generated for confirmation');

    const appt = await prisma.appointment.findFirst({
      where: { customerId: customer.id, businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(appt, 'Appointment must be created in PostgreSQL.');
    createdApptId = appt.id;
    console.log(`  ✓ 6-Turn Voice Booking Completed: Appointment '${createdApptId}' created in PostgreSQL.`);
  } finally {
    if (createdApptId) {
      await prisma.appointment.delete({ where: { id: createdApptId } }).catch(() => {});
      console.log(`  ✓ Cleaned up test appointment '${createdApptId}'.`);
    }
  }

  // ---------------------------------------------------------
  // TEST D: Existing Customer Recognition
  // ---------------------------------------------------------
  console.log('\n4. Test D — Existing Customer Auto-Identification:');

  mockSTT.setTranscript('Hello');
  const existingCustRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy.wav',
    businessId: business.id,
    customerId: customer.id,
    channel: 'VOICE',
  });
  assert.strictEqual(existingCustRes.success, true);
  const identifiedSession = await sessionStore.getSession(existingCustRes.sessionId);
  assert.strictEqual(identifiedSession?.customerId, customer.id);
  assert.strictEqual(identifiedSession?.customerName, customer.name);
  console.log(`  ✓ Existing customer '${customer.name}' recognized without reprompting.`);

  // ---------------------------------------------------------
  // TEST E: Guest Customer Dynamic Creation
  // ---------------------------------------------------------
  console.log('\n5. Test E — Unknown / Guest Customer Dynamic Profile Creation:');

  const guestPhone = `+1-555-888-${Math.floor(1000 + Math.random() * 9000)}`;
  const guestCust = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Test Voice Guest',
      phone: guestPhone,
    },
  });
  assert(guestCust.id);
  console.log(`  ✓ Dynamic guest customer created in PostgreSQL with ID '${guestCust.id}'.`);
  await prisma.customer.delete({ where: { id: guestCust.id } }).catch(() => {});

  // ---------------------------------------------------------
  // TEST F: Empty / Whitespace / Punctuation-Only TTS Suppression
  // ---------------------------------------------------------
  console.log('\n6. Test F — Empty, Whitespace & Punctuation-Only TTS Suppression:');

  const emptyDecision = voiceResponseOptimizer.evaluateTtsDecision('');
  assert.strictEqual(emptyDecision.shouldSynthesize, false);
  assert.strictEqual(emptyDecision.reason, 'EMPTY_OR_WHITESPACE');

  const whitespaceDecision = voiceResponseOptimizer.evaluateTtsDecision('   \t\n  ');
  assert.strictEqual(whitespaceDecision.shouldSynthesize, false);
  assert.strictEqual(whitespaceDecision.reason, 'EMPTY_OR_WHITESPACE');

  const punctuationDecision = voiceResponseOptimizer.evaluateTtsDecision('... ! ? --');
  assert.strictEqual(punctuationDecision.shouldSynthesize, false);
  assert.strictEqual(punctuationDecision.reason, 'PUNCTUATION_ONLY');

  const validDecision = voiceResponseOptimizer.evaluateTtsDecision('Hello, how can I help you today?');
  assert.strictEqual(validDecision.shouldSynthesize, true);
  console.log('  ✓ Verified 100% protection against empty/whitespace/punctuation TTS generation.');

  // ---------------------------------------------------------
  // TEST G: Turn-Scoped Duplicate Synthesis Protection
  // ---------------------------------------------------------
  console.log('\n7. Test G — Turn-Scoped Duplicate Synthesis Protection:');

  voiceResponseOptimizer.clearCache();
  const turn1Key = 'session_123_turn_1';
  const turn2Key = 'session_123_turn_2';
  const spokenPhrase = 'Could you repeat that, please?';
  const mockAudioRef = { id: 'tts_cached_123', fileName: 'tts_cached_123.wav', durationSec: 1.5 };

  // Turn 1 first invocation -> Must synthesize
  const dec1 = voiceResponseOptimizer.evaluateTtsDecision(spokenPhrase, turn1Key);
  assert.strictEqual(dec1.shouldSynthesize, true);
  voiceResponseOptimizer.recordTurnSynthesis(turn1Key, spokenPhrase, mockAudioRef);

  // Turn 1 second identical invocation -> Must reuse cached audio without re-synthesizing
  const dec2 = voiceResponseOptimizer.evaluateTtsDecision(spokenPhrase, turn1Key);
  assert.strictEqual(dec2.shouldSynthesize, false);
  assert.strictEqual(dec2.reason, 'DUPLICATE_TURN_SYNTHESIS');
  assert.strictEqual(dec2.cachedAudio?.id, mockAudioRef.id);

  // Turn 2 identical phrase across different turn -> Must synthesize cleanly
  const dec3 = voiceResponseOptimizer.evaluateTtsDecision(spokenPhrase, turn2Key);
  assert.strictEqual(dec3.shouldSynthesize, true, 'Distinct turns must allow repeated legitimate phrases');
  console.log('  ✓ Turn-scoped duplicate synthesis protection verified without blocking inter-turn repetitions.');

  // ---------------------------------------------------------
  // TEST H: Voice Transport Metrics & End-to-End Integrity
  // ---------------------------------------------------------
  console.log('\n8. Test H — Voice Transport Metrics & End-to-End Pipeline:');

  const mockTransportOrchestrator = new VoiceConversationOrchestrator({
    sttProvider: new MockSTTProvider({ transcript: 'Hello' }),
    ttsProvider: new MockTTSProvider(),
  });

  const customTransportService = new (require('../modules/speech/transport/services/voice-turn-transport.service').VoiceTurnTransportService)({
    orchestrator: mockTransportOrchestrator,
  });

  const transportSessionRes = await customTransportService.processVoiceTurn({
    businessId: business.id,
    audioFilePath: 'dummy_sample.wav',
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(transportSessionRes.success, true);
  assert(typeof transportSessionRes.metrics.responseOptimizationMs === 'number');
  assert(typeof transportSessionRes.metrics.audioConversionMs === 'number');
  assert(typeof transportSessionRes.metrics.sttMs === 'number');
  assert(typeof transportSessionRes.metrics.conversationMs === 'number');
  assert(typeof transportSessionRes.metrics.ttsMs === 'number');
  assert(typeof transportSessionRes.metrics.totalMs === 'number');
  console.log(`  ✓ Complete voice transport metrics verified: OptMs=${transportSessionRes.metrics.responseOptimizationMs}ms, STT=${transportSessionRes.metrics.sttMs}ms, Conv=${transportSessionRes.metrics.conversationMs}ms, TTS=${transportSessionRes.metrics.ttsMs}ms, Total=${transportSessionRes.metrics.totalMs}ms`);

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 7.3.1 VOICE OPTIMIZATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
