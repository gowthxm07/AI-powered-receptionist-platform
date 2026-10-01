import assert from 'assert';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { LUMINA_DENTAL_BUSINESS_ID } from '../modules/ai/knowledge';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runMilestone1LiveVoiceVerification(): Promise<void> {
  console.log('\n================================================================');
  console.log('--- 🎙️  MILESTONE 1: LIVE VOICE CONVERSATIONAL TRIAGE AUDIT ---');
  console.log('================================================================\n');

  const whisper = new WhisperCppProvider();
  const piper = new PiperProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: whisper,
    ttsProvider: piper,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  // ==========================================================================
  // SCENARIO 1: Ambiguous Symptom with Clarification Turn
  // ==========================================================================
  console.log('Scenario 1 — Ambiguous Symptom with Persistent Clarification:');
  const sessRes1 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId1 = sessRes1.session!.transportSessionId;

  // Turn 1: "Something feels weird in my mouth."
  const audio1_1 = await piper.synthesize('Something feels weird in my mouth.');
  const turn1_1 = await transportService.processVoiceTurn({
    transportSessionId: tId1,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio1_1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  [Turn 1] Caller:      "Something feels weird in my mouth."`);
  console.log(`  [Turn 1] Whisper STT: "${turn1_1.transcript}"`);
  console.log(`  [Turn 1] AI Response: "${turn1_1.responseText}"`);
  console.log(`  [Turn 1] Audio ID:    "${turn1_1.audio?.audioId}" (${turn1_1.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn1_1.success, true);
  assert.ok(turn1_1.audio?.audioId, 'Must synthesize TTS audio');
  assert.ok(
    turn1_1.responseText.toLowerCase().includes('pain') ||
    turn1_1.responseText.toLowerCase().includes('sensitivity') ||
    turn1_1.responseText.toLowerCase().includes('swelling') ||
    turn1_1.responseText.toLowerCase().includes('experiencing'),
    'Receptionist must ask a useful dental clarification question'
  );

  const stored1_1 = await sessionStore.getSession(turn1_1.conversationSessionId);
  assert.ok(stored1_1);
  assert.strictEqual(
    stored1_1.step,
    BookingConversationStep.TRIAGE_CLARIFICATION,
    'Must persist TRIAGE_CLARIFICATION step'
  );
  assert.strictEqual(stored1_1.triageProfile?.isAmbiguous, true);

  // Turn 2: "My lower right tooth aches when I drink cold juice."
  const audio1_2 = await piper.synthesize('My lower right tooth aches when I drink cold juice.');
  const turn1_2 = await transportService.processVoiceTurn({
    transportSessionId: tId1,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio1_2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  [Turn 2] Caller:      "My lower right tooth aches when I drink cold juice."`);
  console.log(`  [Turn 2] Whisper STT: "${turn1_2.transcript}"`);
  console.log(`  [Turn 2] AI Response: "${turn1_2.responseText}"`);
  console.log(`  [Turn 2] Audio ID:    "${turn1_2.audio?.audioId}" (${turn1_2.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn1_2.success, true);
  assert.ok(turn1_2.audio?.audioId);
  assert.ok(
    turn1_2.responseText.includes('Comprehensive Oral Exam') ||
    turn1_2.responseText.toLowerCase().includes('examination') ||
    turn1_2.responseText.toLowerCase().includes('evaluat'),
    'Must continue triage smoothly into examination proposal rather than resetting to IDLE'
  );

  const stored1_2 = await sessionStore.getSession(turn1_2.conversationSessionId);
  assert.ok(stored1_2);
  assert.strictEqual(stored1_2.step, BookingConversationStep.BOOKING_SYMPTOM_TRIAGE);
  assert.strictEqual(stored1_2.triageProfile?.isAmbiguous, false);
  assert.ok(stored1_2.triageProfile?.triggers.includes('cold'), 'Should record cold trigger');
  console.log('  ✅ Scenario 1 PASSED: Ambiguous symptom prompted follow-up, persisted state, and advanced.\n');

  // ==========================================================================
  // SCENARIO 2: Natural Clinical Detail during Triage (Non-Binary)
  // ==========================================================================
  console.log('Scenario 2 — Natural Answer during Triage (Non-Binary Loop Avoidance):');
  const sessRes2 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId2 = sessRes2.session!.transportSessionId;

  // Turn 1: Initial complaint
  const audio2_1 = await piper.synthesize('My tooth hurts when I drink cold water.');
  const turn2_1 = await transportService.processVoiceTurn({
    transportSessionId: tId2,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio2_1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });
  console.log(`  [Turn 1] Caller:      "My tooth hurts when I drink cold water."`);
  console.log(`  [Turn 1] Whisper STT: "${turn2_1.transcript}"`);
  console.log(`  [Turn 1] AI Response: "${turn2_1.responseText}"`);

  // Turn 2: Natural clinical clarification: "It is only one tooth."
  const audio2_2 = await piper.synthesize('It is only one tooth.');
  const turn2_2 = await transportService.processVoiceTurn({
    transportSessionId: tId2,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio2_2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });
  console.log(`  [Turn 2] Caller:      "It is only one tooth."`);
  console.log(`  [Turn 2] Whisper STT: "${turn2_2.transcript}"`);
  console.log(`  [Turn 2] AI Response: "${turn2_2.responseText}"`);
  console.log(`  [Turn 2] Audio ID:    "${turn2_2.audio?.audioId}" (${turn2_2.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn2_2.success, true);
  assert.ok(
    !turn2_2.responseText.includes('or would you prefer a different service?'),
    'Must NOT repeat robotic binary loop when caller supplies clinical details'
  );
  assert.ok(
    turn2_2.responseText.toLowerCase().includes('single tooth') ||
    turn2_2.responseText.toLowerCase().includes('one tooth') ||
    turn2_2.responseText.toLowerCase().includes('details'),
    'Must acknowledge clinical facts naturally'
  );

  const stored2 = await sessionStore.getSession(turn2_2.conversationSessionId);
  assert.strictEqual(stored2?.triageProfile?.anatomicalScope, 'single tooth');
  console.log('  ✅ Scenario 2 PASSED: "It is only one tooth" acknowledged naturally without binary repetition.\n');

  // ==========================================================================
  // SCENARIO 3: Pain Information & Non-Diagnostic Framing
  // ==========================================================================
  console.log('Scenario 3 — Pain Information & Non-Diagnostic Clinical Safety:');
  const sessRes3 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId3 = sessRes3.session!.transportSessionId;

  const audio3 = await piper.synthesize("I've had a throbbing toothache since yesterday.");
  const turn3 = await transportService.processVoiceTurn({
    transportSessionId: tId3,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio3.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "I've had a throbbing toothache since yesterday."`);
  console.log(`  Whisper STT: "${turn3.transcript}"`);
  console.log(`  AI Response: "${turn3.responseText}"`);
  console.log(`  Audio ID:    "${turn3.audio?.audioId}" (${turn3.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn3.success, true);
  const stored3 = await sessionStore.getSession(turn3.conversationSessionId);
  assert.strictEqual(stored3?.triageProfile?.painPattern, 'throbbing');
  assert.strictEqual(stored3?.triageProfile?.onset, 'yesterday');
  assert.ok(!turn3.responseText.toLowerCase().includes('you have pulpitis'), 'Must NOT diagnose pulpitis');
  assert.ok(!turn3.responseText.toLowerCase().includes('you have an abscess'), 'Must NOT diagnose abscess');
  assert.ok(
    turn3.responseText.includes('Comprehensive Oral Exam') ||
    turn3.responseText.toLowerCase().includes('examination'),
    'Must guide toward examination'
  );
  console.log('  ✅ Scenario 3 PASSED: Throbbing pattern and onset stored; strictly non-diagnostic.\n');

  // ==========================================================================
  // SCENARIO 4: Negative Finding ("no swelling" NOT interpreted as rejection)
  // ==========================================================================
  console.log('Scenario 4 — Negative Clinical Finding ("no swelling"):');
  const sessRes4 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId4 = sessRes4.session!.transportSessionId;

  // Turn 1: Initial complaint
  const audio4_1 = await piper.synthesize('I have a toothache.');
  await transportService.processVoiceTurn({
    transportSessionId: tId4,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio4_1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 2: Negative finding: "I don't have any swelling."
  const audio4_2 = await piper.synthesize("I don't have any swelling.");
  const turn4_2 = await transportService.processVoiceTurn({
    transportSessionId: tId4,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio4_2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "I don't have any swelling."`);
  console.log(`  Whisper STT: "${turn4_2.transcript}"`);
  console.log(`  AI Response: "${turn4_2.responseText}"`);
  console.log(`  Audio ID:    "${turn4_2.audio?.audioId}" (${turn4_2.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn4_2.success, true);
  assert.ok(
    !turn4_2.responseText.includes('Which dental service would you prefer'),
    'Must NOT treat "no swelling" as a negative service rejection'
  );
  assert.ok(
    turn4_2.responseText.includes('Comprehensive Oral Exam') ||
    turn4_2.responseText.toLowerCase().includes('no swelling'),
    'Must acknowledge negative finding and continue triage'
  );

  const stored4 = await sessionStore.getSession(turn4_2.conversationSessionId);
  assert.strictEqual(stored4?.triageProfile?.swellingPresent, false);
  console.log('  ✅ Scenario 4 PASSED: Negative finding recorded as false without triggering booking rejection.\n');

  // ==========================================================================
  // SCENARIO 5: Patient Clinical Correction (Latest statement wins)
  // ==========================================================================
  console.log('Scenario 5 — Patient Clinical Correction (Latest Statement Wins):');
  const sessRes5 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId5 = sessRes5.session!.transportSessionId;

  // Turn 1: "It started yesterday."
  const audio5_1 = await piper.synthesize('I have a toothache and it started yesterday.');
  await transportService.processVoiceTurn({
    transportSessionId: tId5,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio5_1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 2: "Actually, it started five days ago."
  const audio5_2 = await piper.synthesize('Actually, it started five days ago.');
  const turn5_2 = await transportService.processVoiceTurn({
    transportSessionId: tId5,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio5_2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "Actually, it started five days ago."`);
  console.log(`  Whisper STT: "${turn5_2.transcript}"`);
  console.log(`  AI Response: "${turn5_2.responseText}"`);

  assert.strictEqual(turn5_2.success, true);
  const stored5 = await sessionStore.getSession(turn5_2.conversationSessionId);
  assert.ok(
    stored5?.triageProfile?.onset?.includes('5 days') || stored5?.triageProfile?.duration?.includes('5 days'),
    `Expected updated onset/duration to be 5 days, got onset: "${stored5?.triageProfile?.onset}", duration: "${stored5?.triageProfile?.duration}"`
  );
  console.log('  ✅ Scenario 5 PASSED: Patient correction updated onset/duration cleanly to 5 days.\n');

  // ==========================================================================
  // SCENARIO 6: Broken Tooth (Evaluation-First Mapping)
  // ==========================================================================
  console.log('Scenario 6 — Broken Tooth (Evaluation-First Mapping):');
  const sessRes6 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId6 = sessRes6.session!.transportSessionId;

  const audio6 = await piper.synthesize('A piece of my back tooth broke while eating.');
  const turn6 = await transportService.processVoiceTurn({
    transportSessionId: tId6,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio6.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "A piece of my back tooth broke while eating."`);
  console.log(`  Whisper STT: "${turn6.transcript}"`);
  console.log(`  AI Response: "${turn6.responseText}"`);

  assert.strictEqual(turn6.success, true);
  assert.ok(
    turn6.responseText.includes('Comprehensive Oral Exam') || turn6.responseText.toLowerCase().includes('evaluation'),
    'Must propose evaluation/examination first'
  );
  assert.ok(
    !turn6.responseText.includes('Ceramic Crown Preparation & Digital 3D Scan'),
    'Must NOT prematurely book $850 Ceramic Crown Preparation without examination'
  );
  console.log('  ✅ Scenario 6 PASSED: Broken tooth appropriately mapped to Comprehensive Oral Exam evaluation.\n');

  // ==========================================================================
  // SCENARIO 7: Missing Tooth Replacement Goal at Lumina
  // ==========================================================================
  console.log('Scenario 7 — Missing Tooth Replacement Goal at Lumina:');
  const sessRes7 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId7 = sessRes7.session!.transportSessionId;

  const audio7 = await piper.synthesize('I lost a tooth a few months ago and I want to replace it.');
  const turn7 = await transportService.processVoiceTurn({
    transportSessionId: tId7,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio7.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "I lost a tooth a few months ago and I want to replace it."`);
  console.log(`  Whisper STT: "${turn7.transcript}"`);
  console.log(`  AI Response: "${turn7.responseText}"`);

  assert.strictEqual(turn7.success, true);
  assert.ok(
    turn7.responseText.toLowerCase().includes('evaluation') || turn7.responseText.toLowerCase().includes('examination'),
    'Must offer oral evaluation to assess replacement options'
  );
  assert.ok(
    !turn7.responseText.includes('Laser Enamel Whitening') &&
    !turn7.responseText.includes('Ultrasonic Prophylaxis'),
    'Must not book unrelated procedure'
  );
  console.log('  ✅ Scenario 7 PASSED: Missing tooth replacement goal guided toward evaluation.\n');

  // ==========================================================================
  // SCENARIO 8: Spreading Facial Swelling (Urgent Care Protocol)
  // ==========================================================================
  console.log('Scenario 8 — Spreading Facial Swelling (Urgent Care Protocol):');
  const sessRes8 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId8 = sessRes8.session!.transportSessionId;

  const audio8 = await piper.synthesize('My gum is swollen and my cheek is starting to swell.');
  const turn8 = await transportService.processVoiceTurn({
    transportSessionId: tId8,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio8.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "My gum is swollen and my cheek is starting to swell."`);
  console.log(`  Whisper STT: "${turn8.transcript}"`);
  console.log(`  AI Response: "${turn8.responseText}"`);

  assert.strictEqual(turn8.success, true);
  assert.ok(
    turn8.responseText.toLowerCase().includes('infection') ||
    turn8.responseText.toLowerCase().includes('urgent'),
    'Must identify as active dental infection requiring urgent care'
  );
  assert.ok(
    !turn8.responseText.includes('does not currently list that specialized treatment'),
    'Must NOT treat as service unavailable'
  );
  console.log('  ✅ Scenario 8 PASSED: Spreading cheek swelling prioritized with urgent dental infection guidance.\n');

  // ==========================================================================
  // SCENARIO 9: Cosmetic Tone Adaptation (No Pain Apology)
  // ==========================================================================
  console.log('Scenario 9 — Cosmetic Tone Adaptation (No Pain Apology):');
  const sessRes9 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId9 = sessRes9.session!.transportSessionId;

  const audio9 = await piper.synthesize('My teeth are yellow and I want them whiter for an event next month.');
  const turn9 = await transportService.processVoiceTurn({
    transportSessionId: tId9,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio9.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "My teeth are yellow and I want them whiter for an event next month."`);
  console.log(`  Whisper STT: "${turn9.transcript}"`);
  console.log(`  AI Response: "${turn9.responseText}"`);

  assert.strictEqual(turn9.success, true);
  assert.ok(
    !turn9.responseText.toLowerCase().includes("i'm sorry to hear that"),
    'Must NOT offer pain apology for cosmetic teeth whitening inquiry'
  );
  assert.ok(
    turn9.responseText.includes('Laser Enamel Whitening') ||
    turn9.responseText.toLowerCase().includes('whitening') ||
    turn9.responseText.toLowerCase().includes('certainly'),
    'Must adopt cheerful, professional tone'
  );
  console.log('  ✅ Scenario 9 PASSED: Cosmetic whitening received upbeat tone without pain apology.\n');

  // ==========================================================================
  // SCENARIO 10: FAQ Interruption During Active Triage & Exact Resumption
  // ==========================================================================
  console.log('Scenario 10 — FAQ Interruption During Active Triage & Resumption:');
  const sessRes10 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId10 = sessRes10.session!.transportSessionId;

  // Turn 1: Start ambiguous symptom triage
  const audio10_1 = await piper.synthesize('Something feels weird in my mouth.');
  await transportService.processVoiceTurn({
    transportSessionId: tId10,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio10_1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 2: FAQ interruption: "Can I bring someone with me?"
  const audio10_2 = await piper.synthesize('Can I bring someone with me?');
  const turn10_2 = await transportService.processVoiceTurn({
    transportSessionId: tId10,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio10_2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  [Turn 2] Caller:      "Can I bring someone with me?"`);
  console.log(`  [Turn 2] Whisper STT: "${turn10_2.transcript}"`);
  console.log(`  [Turn 2] AI Response: "${turn10_2.responseText}"`);

  assert.strictEqual(turn10_2.success, true);
  assert.ok(
    turn10_2.responseText.toLowerCase().includes('welcome to bring') ||
    turn10_2.responseText.toLowerCase().includes('support') ||
    turn10_2.responseText.toLowerCase().includes('companion') ||
    turn10_2.responseText.toLowerCase().includes('family member'),
    'Must answer visitor/companion FAQ'
  );
  assert.ok(
    turn10_2.responseText.includes('Returning to your dental concern') ||
    turn10_2.responseText.toLowerCase().includes('dental concern'),
    'Must prompt resumption of the active triage question'
  );

  const stored10 = await sessionStore.getSession(turn10_2.conversationSessionId);
  assert.strictEqual(
    stored10?.step,
    BookingConversationStep.TRIAGE_CLARIFICATION,
    'Must preserve TRIAGE_CLARIFICATION step through FAQ interruption'
  );
  console.log('  ✅ Scenario 10 PASSED: Visitor policy FAQ answered and TRIAGE_CLARIFICATION resumed.\n');

  console.log('================================================================');
  console.log('🎉 ALL 10 MILESTONE 1 LIVE VOICE SCENARIOS PASSED CLEANLY! 🎉');
  console.log('================================================================\n');
}

if (require.main === module) {
  runMilestone1LiveVoiceVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
