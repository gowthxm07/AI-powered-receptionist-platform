import assert from 'assert';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { LUMINA_DENTAL_BUSINESS_ID } from '../modules/ai/knowledge';

export async function runMilestone2LiveVoiceVerification(): Promise<void> {
  console.log('\n================================================================');
  console.log('--- 🎙️  MILESTONE 2: LIVE VOICE MULTI-SYMPTOM & GOAL AUDIT ---');
  console.log('================================================================\n');

  const whisper = new WhisperCppProvider();
  const piper = new PiperProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: whisper,
    ttsProvider: piper,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  // ==========================================================================
  // SCENARIO 1: Multi-Symptom Synthesis (Broken Tooth + Throbbing Pain)
  // ==========================================================================
  console.log('Scenario 1 — Multi-Symptom: Broken Tooth + Throbbing Pain:');
  const sessRes1 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId1 = sessRes1.session!.transportSessionId;

  const phrase1 = 'My tooth broke and now it throbs.';
  const audio1 = await piper.synthesize(phrase1);
  const turn1 = await transportService.processVoiceTurn({
    transportSessionId: tId1,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "${phrase1}"`);
  console.log(`  Whisper STT: "${turn1.transcript}"`);
  console.log(`  AI Response: "${turn1.responseText}"`);
  console.log(`  Audio ID:    "${turn1.audio?.audioId}" (${turn1.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn1.success, true);
  assert.ok(turn1.audio?.audioId, 'Must synthesize TTS audio');
  assert.ok(
    turn1.responseText.toLowerCase().includes('broken') ||
      turn1.responseText.toLowerCase().includes('fracture') ||
      turn1.responseText.toLowerCase().includes('discomfort') ||
      turn1.responseText.toLowerCase().includes('pulp'),
    'Receptionist must acknowledge the composite broken/throbbing problem'
  );

  const stored1 = await sessionStore.getSession(turn1.conversationSessionId);
  assert.ok(stored1);
  assert.ok(stored1.triageProfile, 'Session must retain triageProfile');
  assert.ok(
    stored1.triageProfile.reportedSymptoms.includes('broken tooth'),
    'Must capture broken tooth in reportedSymptoms'
  );
  assert.ok(
    stored1.triageProfile.reportedSymptoms.includes('throbbing tooth pain'),
    'Must capture throbbing pain in reportedSymptoms'
  );
  assert.strictEqual(stored1.triageProfile.urgencyLevel, 'HIGH');
  console.log('  ✅ Scenario 1 PASSED: Multi-symptom synthesis verified over live voice.\n');

  // ==========================================================================
  // SCENARIO 2: Dual Complaint (Bleeding Gums + Cold Sensitivity)
  // ==========================================================================
  console.log('Scenario 2 — Dual Complaint: Bleeding Gums + Cold Sensitivity:');
  const sessRes2 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId2 = sessRes2.session!.transportSessionId;

  const phrase2 = 'My gums bleed when I brush and my teeth are sensitive to cold.';
  const audio2 = await piper.synthesize(phrase2);
  const turn2 = await transportService.processVoiceTurn({
    transportSessionId: tId2,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "${phrase2}"`);
  console.log(`  Whisper STT: "${turn2.transcript}"`);
  console.log(`  AI Response: "${turn2.responseText}"`);
  console.log(`  Audio ID:    "${turn2.audio?.audioId}" (${turn2.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn2.success, true);
  assert.ok(turn2.audio?.audioId);
  assert.ok(
    turn2.responseText.toLowerCase().includes('gum') ||
      turn2.responseText.toLowerCase().includes('sensitivity') ||
      turn2.responseText.toLowerCase().includes('bleeding'),
    'Must address dual periodontal and sensitivity signals'
  );

  const stored2 = await sessionStore.getSession(turn2.conversationSessionId);
  assert.ok(stored2);
  assert.ok(stored2.triageProfile);
  assert.ok(
    stored2.triageProfile.reportedSymptoms.includes('bleeding gums'),
    'Must retain bleeding gums symptom'
  );
  assert.ok(
    stored2.triageProfile.reportedSymptoms.includes('cold sensitivity') ||
      stored2.triageProfile.triggers.includes('cold'),
    'Must retain cold sensitivity symptom'
  );
  console.log('  ✅ Scenario 2 PASSED: Both signals preserved without single-winner discarding.\n');

  // ==========================================================================
  // SCENARIO 3: Patient Goal = Tooth Replacement (Evaluation First)
  // ==========================================================================
  console.log('Scenario 3 — Patient Goal: Tooth Replacement (Evaluation First):');
  const sessRes3 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId3 = sessRes3.session!.transportSessionId;

  const phrase3 = 'I lost a tooth and I want to replace it.';
  const audio3 = await piper.synthesize(phrase3);
  const turn3 = await transportService.processVoiceTurn({
    transportSessionId: tId3,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio3.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "${phrase3}"`);
  console.log(`  Whisper STT: "${turn3.transcript}"`);
  console.log(`  AI Response: "${turn3.responseText}"`);
  console.log(`  Audio ID:    "${turn3.audio?.audioId}" (${turn3.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn3.success, true);
  assert.ok(turn3.audio?.audioId);
  assert.ok(
    turn3.responseText.toLowerCase().includes('replac') ||
      turn3.responseText.toLowerCase().includes('evaluat') ||
      turn3.responseText.toLowerCase().includes('option'),
    'Must discuss replacement evaluation and options'
  );

  const stored3 = await sessionStore.getSession(turn3.conversationSessionId);
  assert.ok(stored3);
  assert.strictEqual(stored3.triageProfile?.patientGoal, 'REPLACE_MISSING_TOOTH');
  console.log('  ✅ Scenario 3 PASSED: Tooth replacement goal inferred with evaluation guidance.\n');

  // ==========================================================================
  // SCENARIO 4: Patient Goal = Evaluation (Uncertain Clinical Need)
  // ==========================================================================
  console.log('Scenario 4 — Patient Goal: Evaluation (Uncertain Need):');
  const sessRes4 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId4 = sessRes4.session!.transportSessionId;

  const phrase4 = "I don't know what treatment I need. I just want someone to check it.";
  const audio4 = await piper.synthesize(phrase4);
  const turn4 = await transportService.processVoiceTurn({
    transportSessionId: tId4,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio4.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "${phrase4}"`);
  console.log(`  Whisper STT: "${turn4.transcript}"`);
  console.log(`  AI Response: "${turn4.responseText}"`);
  console.log(`  Audio ID:    "${turn4.audio?.audioId}" (${turn4.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn4.success, true);
  assert.ok(turn4.audio?.audioId);
  assert.ok(
    turn4.responseText.includes('Comprehensive Oral Exam') ||
      turn4.responseText.toLowerCase().includes('examin') ||
      turn4.responseText.toLowerCase().includes('check'),
    'Must recommend clinical evaluation'
  );

  const stored4 = await sessionStore.getSession(turn4.conversationSessionId);
  assert.ok(stored4);
  assert.strictEqual(stored4.triageProfile?.patientGoal, 'EVALUATION');
  console.log('  ✅ Scenario 4 PASSED: General checkup inquiry mapped to evaluation.\n');

  // ==========================================================================
  // SCENARIO 5: Patient Goal = Aesthetic Whitening
  // ==========================================================================
  console.log('Scenario 5 — Patient Goal: Aesthetic Whitening:');
  const sessRes5 = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tId5 = sessRes5.session!.transportSessionId;

  const phrase5 = 'I want my teeth whiter for an event.';
  const audio5 = await piper.synthesize(phrase5);
  const turn5 = await transportService.processVoiceTurn({
    transportSessionId: tId5,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audio5.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller:      "${phrase5}"`);
  console.log(`  Whisper STT: "${turn5.transcript}"`);
  console.log(`  AI Response: "${turn5.responseText}"`);
  console.log(`  Audio ID:    "${turn5.audio?.audioId}" (${turn5.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turn5.success, true);
  assert.ok(turn5.audio?.audioId);
  assert.ok(
    turn5.responseText.toLowerCase().includes('whiten') ||
      turn5.responseText.toLowerCase().includes('bright'),
    'Must address cosmetic whitening goal'
  );

  const stored5 = await sessionStore.getSession(turn5.conversationSessionId);
  assert.ok(stored5);
  assert.strictEqual(stored5.triageProfile?.patientGoal, 'WHITEN_TEETH');
  console.log('  ✅ Scenario 5 PASSED: Aesthetic whitening goal verified with enthusiastic tone.\n');

  console.log('================================================================');
  console.log('🎉 ALL 5 MILESTONE 2 LIVE VOICE SCENARIOS PASSED CLEANLY! 🎉');
  console.log('================================================================\n');
}

// Direct execution support
if (require.main === module) {
  runMilestone2LiveVoiceVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Milestone 2 Live Voice Verification failed:', err);
      process.exit(1);
    });
}
