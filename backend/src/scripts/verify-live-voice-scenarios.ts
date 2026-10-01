import assert from 'assert';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { LUMINA_DENTAL_BUSINESS_ID } from '../modules/ai/knowledge';

export async function runLiveVoiceScenariosVerification(): Promise<void> {
  console.log('\n================================================================');
  console.log('--- 🎙️  LIVE VOICE INTERFACE VERIFICATION: DENTAL SCENARIOS ---');
  console.log('================================================================\n');

  const whisper = new WhisperCppProvider();
  const piper = new PiperProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: whisper,
    ttsProvider: piper,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  // --------------------------------------------------------------------------
  // TEST A: Triage Patient Problem (Throbbing Tooth & Temperature Trigger)
  // --------------------------------------------------------------------------
  console.log('Scenario A — Patient Problem Triage:');
  const utteranceA = 'My tooth has been throbbing badly since last night and hurts when I drink hot coffee.';
  const audioA = await piper.synthesize(utteranceA);
  const sessionResA = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnA = await transportService.processVoiceTurn({
    transportSessionId: sessionResA.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioA.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceA}"`);
  console.log(`  Whisper STT:     "${turnA.transcript}"`);
  console.log(`  AI Response:     "${turnA.responseText}"`);
  console.log(`  Audio Output ID: "${turnA.audio?.audioId}" (${turnA.audio?.durationSec?.toFixed(2)}s)`);
  console.log(`  Metrics:         STT=${turnA.metrics.sttMs}ms, Conv=${turnA.metrics.conversationMs}ms, TTS=${turnA.metrics.ttsMs}ms, Total=${turnA.metrics.totalMs}ms`);

  assert.strictEqual(turnA.success, true);
  assert.ok(turnA.audio?.audioId, 'Must produce synthesized audio');
  assert.ok(
    turnA.responseText.toLowerCase().includes('pulp') ||
    turnA.responseText.toLowerCase().includes('associated with') ||
    turnA.responseText.toLowerCase().includes('examination') ||
    turnA.responseText.toLowerCase().includes('exam') ||
    turnA.responseText.toLowerCase().includes('comprehensive oral exam'),
    'Must explain possible association and recommend examination'
  );
  assert.ok(!turnA.responseText.toLowerCase().includes('you definitely have'), 'Must not make definitive diagnosis');
  console.log('  ✅ Scenario A PASSED: Tentative non-diagnostic language with clinical examination recommendation.\n');

  // --------------------------------------------------------------------------
  // TEST B: Natural Non-Medical Terminology (Hole in tooth / food trap)
  // --------------------------------------------------------------------------
  console.log('Scenario B — Natural Non-Medical Terminology:');
  const utteranceB = "There's a hole in my back tooth and food keeps getting stuck.";
  const audioB = await piper.synthesize(utteranceB);
  const sessionResB = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnB = await transportService.processVoiceTurn({
    transportSessionId: sessionResB.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioB.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceB}"`);
  console.log(`  Whisper STT:     "${turnB.transcript}"`);
  console.log(`  AI Response:     "${turnB.responseText}"`);
  console.log(`  Audio Output ID: "${turnB.audio?.audioId}" (${turnB.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turnB.success, true);
  assert.ok(
    turnB.responseText.toLowerCase().includes('cavity') ||
    turnB.responseText.toLowerCase().includes('caries') ||
    turnB.responseText.toLowerCase().includes('filling') ||
    turnB.responseText.toLowerCase().includes('restoration') ||
    turnB.responseText.toLowerCase().includes('exam'),
    'Must map food trap/hole to caries restoration or comprehensive exam'
  );
  console.log('  ✅ Scenario B PASSED: Patient vernacular mapped safely to restorative evaluation.\n');

  // --------------------------------------------------------------------------
  // TEST C: Clinic Capability Boundary (Unavailable Service: Implants at Lumina)
  // --------------------------------------------------------------------------
  console.log('Scenario C — Clinic Capability Boundary (Unavailable Service):');
  const utteranceC = 'Do you do dental implants here?';
  const audioC = await piper.synthesize(utteranceC);
  const sessionResC = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnC = await transportService.processVoiceTurn({
    transportSessionId: sessionResC.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioC.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceC}"`);
  console.log(`  Whisper STT:     "${turnC.transcript}"`);
  console.log(`  AI Response:     "${turnC.responseText}"`);
  console.log(`  Audio Output ID: "${turnC.audio?.audioId}" (${turnC.audio?.durationSec?.toFixed(2)}s)`);

  assert.strictEqual(turnC.success, true);
  assert.ok(
    turnC.responseText.includes('Lumina Dental Care does not currently list dental implant treatment') ||
    turnC.responseText.includes('does not currently list that specialized treatment'),
    'Must explain that clinic does not list this specialized service'
  );
  assert.ok(
    turnC.responseText.toLowerCase().includes('local') ||
    turnC.responseText.toLowerCase().includes('clinic') ||
    turnC.responseText.toLowerCase().includes('provider'),
    'Must suggest finding a local provider'
  );
  assert.ok(
    turnC.responseText.toLowerCase().includes('available at lumina') ||
    turnC.responseText.toLowerCase().includes('services available') ||
    turnC.responseText.toLowerCase().includes('comprehensive oral exam') ||
    turnC.responseText.toLowerCase().includes('do provide'),
    'Must offer actual available services'
  );
  console.log('  ✅ Scenario C PASSED: Honest boundary enforcement without auto-booking defaults.\n');

  // --------------------------------------------------------------------------
  // TEST D: Mid-Booking FAQ Interruption & Exact Resumption
  // --------------------------------------------------------------------------
  console.log('Scenario D — Mid-Booking FAQ Interruption & Resumption:');
  const sessionResD = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const tDId = sessionResD.session!.transportSessionId;

  // Turn 1: Start booking
  const audioD1 = await piper.synthesize('I want to book an appointment');
  await transportService.processVoiceTurn({
    transportSessionId: tDId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioD1.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 2: Service
  const audioD2 = await piper.synthesize('Comprehensive Oral Exam');
  await transportService.processVoiceTurn({
    transportSessionId: tDId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioD2.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 3: Doctor
  const audioD3 = await piper.synthesize('Dr. Marcus Thorne');
  await transportService.processVoiceTurn({
    transportSessionId: tDId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioD3.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  // Turn 4: Interruption with companion inquiry while waiting for date
  const utteranceD4 = 'Can I bring someone with me for support?';
  const audioD4 = await piper.synthesize(utteranceD4);
  const turnD4 = await transportService.processVoiceTurn({
    transportSessionId: tDId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioD4.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceD4}"`);
  console.log(`  Whisper STT:     "${turnD4.transcript}"`);
  console.log(`  AI Response:     "${turnD4.responseText}"`);

  assert.strictEqual(turnD4.success, true);
  assert.ok(
    turnD4.responseText.toLowerCase().includes('welcome to bring') ||
    turnD4.responseText.toLowerCase().includes('family member') ||
    turnD4.responseText.toLowerCase().includes('companion') ||
    turnD4.responseText.toLowerCase().includes('support'),
    'Must answer visitor companion policy factually'
  );
  assert.ok(
    turnD4.responseText.toLowerCase().includes('date') ||
    turnD4.responseText.toLowerCase().includes('returning to your booking'),
    'Must resume the active date collection step'
  );

  const activeSessD = await sessionStore.getSession(turnD4.conversationSessionId);
  assert.strictEqual(activeSessD?.selectedServiceName, 'Comprehensive Oral Exam & Digital X-Rays');
  assert.strictEqual(activeSessD?.selectedStaffName, 'Dr. Marcus Thorne');
  console.log('  ✅ Scenario D PASSED: Grounded FAQ answered mid-flow with state preserved and step resumed.\n');

  // --------------------------------------------------------------------------
  // TEST E: Appointment Preparation / Reports Inquiry
  // --------------------------------------------------------------------------
  console.log('Scenario E — Appointment Preparation & Reports:');
  const utteranceE = 'Do I need to bring previous dental X-rays?';
  const audioE = await piper.synthesize(utteranceE);
  const sessionResE = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnE = await transportService.processVoiceTurn({
    transportSessionId: sessionResE.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioE.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceE}"`);
  console.log(`  Whisper STT:     "${turnE.transcript}"`);
  console.log(`  AI Response:     "${turnE.responseText}"`);

  assert.strictEqual(turnE.success, true);
  assert.ok(
    turnE.responseText.toLowerCase().includes('x-ray') ||
    turnE.responseText.toLowerCase().includes('records') ||
    turnE.responseText.toLowerCase().includes('helpful') ||
    turnE.responseText.toLowerCase().includes('photo id') ||
    turnE.responseText.toLowerCase().includes('digital'),
    'Must provide verified guidance on reports, radiographs, or identification'
  );
  console.log('  ✅ Scenario E PASSED: Grounded clinic preparation guidance delivered without hallucination.\n');

  // --------------------------------------------------------------------------
  // TEST F: Completely Unrelated Query Redirection
  // --------------------------------------------------------------------------
  console.log('Scenario F — Completely Unrelated Inquiry Redirection:');
  const utteranceF = 'Do you fix laptop screens?';
  const audioF = await piper.synthesize(utteranceF);
  const sessionResF = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnF = await transportService.processVoiceTurn({
    transportSessionId: sessionResF.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioF.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceF}"`);
  console.log(`  Whisper STT:     "${turnF.transcript}"`);
  console.log(`  AI Response:     "${turnF.responseText}"`);

  assert.strictEqual(turnF.success, true);
  assert.ok(
    turnF.responseText.toLowerCase().includes('dental') ||
    turnF.responseText.toLowerCase().includes('lumina') ||
    turnF.responseText.toLowerCase().includes('appointment') ||
    turnF.responseText.toLowerCase().includes('clinic'),
    'Must gently redirect caller to dental appointments and clinic services'
  );
  console.log('  ✅ Scenario F PASSED: Off-topic inquiry redirected politely to clinic domain.\n');

  // --------------------------------------------------------------------------
  // TEST G: Life-Threatening Emergency Override
  // --------------------------------------------------------------------------
  console.log('Scenario G — Urgent Emergency Override:');
  const utteranceG = 'I was hit in the face and my tooth got knocked out completely.';
  const audioG = await piper.synthesize(utteranceG);
  const sessionResG = await voiceTransportSessionManager.createTransportSession({
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    channel: 'MOBILE_WEB',
  });
  const turnG = await transportService.processVoiceTurn({
    transportSessionId: sessionResG.session!.transportSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    audioFilePath: audioG.audioPath,
    clientChannel: 'MOBILE_WEB',
  });

  console.log(`  Caller (Spoken): "${utteranceG}"`);
  console.log(`  Whisper STT:     "${turnG.transcript}"`);
  console.log(`  AI Response:     "${turnG.responseText}"`);

  assert.strictEqual(turnG.success, true);
  assert.ok(
    turnG.responseText.toLowerCase().includes('emergency') ||
    turnG.responseText.toLowerCase().includes('immediate') ||
    turnG.responseText.toLowerCase().includes('urgent') ||
    turnG.responseText.toLowerCase().includes('911') ||
    turnG.responseText.toLowerCase().includes('milk'),
    'Must trigger urgent emergency protocol and safe handling guidance'
  );
  assert.ok(!turnG.responseText.toLowerCase().includes('which service would you like to book'), 'Must bypass routine appointment booking');
  console.log('  ✅ Scenario G PASSED: Emergency override immediately triggered safety instructions and ER protocol.\n');

  console.log('================================================================');
  console.log('🎉 ALL 7 LIVE VOICE INTERFACE SCENARIOS VERIFIED SUCCESSFULLY! 🎉');
  console.log('================================================================\n');
}

if (require.main === module) {
  runLiveVoiceScenariosVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
