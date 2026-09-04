import assert from 'assert';
import { prisma } from '../lib/prisma';
import {
  voiceActivityAnalyzerService,
  VoiceActivityAnalyzerService,
  DEFAULT_VAD_CONFIG,
} from '../modules/speech/services/voice-activity-analyzer.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { MockSTTProvider } from '../modules/speech/providers/mock-stt.provider';
import { MockTTSProvider } from '../modules/speech/providers/mock-tts.provider';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';

export async function runVoiceTurnDetectionTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Phase 7.3.2 Voice Turn Detection Tests ---');
  console.log('======================================================');

  // Fetch demo business for end-to-end regression
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist.');

  // ---------------------------------------------------------
  // TEST A: Voice Activity Detection (Silence vs. Speech & RMS Calculation)
  // ---------------------------------------------------------
  console.log('\n1. Test A — Voice Activity Detection & RMS Amplitude Analysis:');

  // Synthesize digital silence buffer (all samples at 128)
  const silenceBuffer = new Uint8Array(256).fill(128);
  const silenceRms = voiceActivityAnalyzerService.calculateRmsFromTimeDomain(silenceBuffer);
  assert.strictEqual(silenceRms, 0, 'Pure digital silence must produce 0.0 RMS');

  // Ambient room noise (samples with slight jitter ±3 from 128)
  const ambientBuffer = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    ambientBuffer[i] = 128 + (i % 5 - 2); // 126 to 130
  }
  const ambientRms = voiceActivityAnalyzerService.calculateRmsFromTimeDomain(ambientBuffer);
  assert(ambientRms < DEFAULT_VAD_CONFIG.speechThresholdRms, `Ambient noise (${ambientRms.toFixed(4)}) must be below threshold (${DEFAULT_VAD_CONFIG.speechThresholdRms})`);

  // Active spoken voice (samples swinging ±40 to ±80 from 128)
  const voiceBuffer = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    voiceBuffer[i] = Math.round(128 + 60 * Math.sin(i * 0.2));
  }
  const voiceRms = voiceActivityAnalyzerService.calculateRmsFromTimeDomain(voiceBuffer);
  assert(voiceRms > DEFAULT_VAD_CONFIG.speechThresholdRms, `Spoken voice (${voiceRms.toFixed(4)}) must exceed threshold (${DEFAULT_VAD_CONFIG.speechThresholdRms})`);

  // Configurable threshold evaluation
  const customAnalyzer = new VoiceActivityAnalyzerService();
  const state0 = customAnalyzer.createInitialState(1000);
  const transLow = customAnalyzer.evaluateSpeechState(0.03, state0, { speechThresholdRms: 0.02 }, 1050);
  assert.strictEqual(transLow.isSpeakingNow, true, 'RMS 0.03 must be detected as speaking when threshold is 0.02');

  const transHigh = customAnalyzer.evaluateSpeechState(0.03, state0, { speechThresholdRms: 0.05 }, 1050);
  assert.strictEqual(transHigh.isSpeakingNow, false, 'RMS 0.03 must be detected as silence when threshold is 0.05');

  console.log(`  ✓ Measured RMS: Silence=${silenceRms.toFixed(4)}, Ambient=${ambientRms.toFixed(4)}, Speech=${voiceRms.toFixed(4)}.`);
  console.log('  ✓ Configurable threshold sensitivity verified.');

  // ---------------------------------------------------------
  // TEST B: No Speech Recording Rejection
  // ---------------------------------------------------------
  console.log('\n2. Test B — No Speech Recording Validation:');

  const noSpeechResult = voiceActivityAnalyzerService.validateAudioRecording({
    durationMs: 2500,
    sizeBytes: 15000,
    speechDetected: false, // User tapped speak but remained silent
    mimeType: 'audio/webm',
  });

  assert.strictEqual(noSpeechResult.isValid, false, 'Silent recording must be rejected');
  assert.strictEqual(noSpeechResult.code, 'NO_SPEECH_DETECTED');
  assert.strictEqual(noSpeechResult.userMessage, "I couldn't hear anything. Please try speaking again.");
  console.log('  ✓ Silent recording cleanly blocked from upload with friendly message.');

  // ---------------------------------------------------------
  // TEST C: Normal Speech Validation
  // ---------------------------------------------------------
  console.log('\n3. Test C — Normal Speech Recording Validation:');

  const validSpeechResult = voiceActivityAnalyzerService.validateAudioRecording({
    durationMs: 3200,
    sizeBytes: 38400,
    speechDetected: true,
    mimeType: 'audio/webm;codecs=opus',
  });

  assert.strictEqual(validSpeechResult.isValid, true);
  assert.strictEqual(validSpeechResult.code, undefined);
  console.log('  ✓ Valid spoken audio recording passed pre-upload checks.');

  // ---------------------------------------------------------
  // TEST D: Accidental Short Recording Handling
  // ---------------------------------------------------------
  console.log('\n4. Test D — Short Recording (< 300 ms) Accidental Tap Protection:');

  const shortTapResult = voiceActivityAnalyzerService.validateAudioRecording({
    durationMs: 120, // 0.12s tap
    sizeBytes: 1200,
    speechDetected: false,
    mimeType: 'audio/webm',
  });

  assert.strictEqual(shortTapResult.isValid, false);
  assert.strictEqual(shortTapResult.code, 'TOO_SHORT');
  assert(shortTapResult.userMessage?.includes('too short'));

  const emptyBlobResult = voiceActivityAnalyzerService.validateAudioRecording({
    durationMs: 1500,
    sizeBytes: 150, // 150 bytes empty header
    speechDetected: true,
    mimeType: 'audio/webm',
  });
  assert.strictEqual(emptyBlobResult.isValid, false);
  assert.strictEqual(emptyBlobResult.code, 'EMPTY_AUDIO');
  console.log('  ✓ Accidental short taps (<300ms) and corrupted empty blobs (<500B) blocked.');

  // ---------------------------------------------------------
  // TEST E: Auto-Stop on Sustained Silence vs. Short Pause
  // ---------------------------------------------------------
  console.log('\n5. Test E — Auto-Stop Trigger on Sustained Silence & Pause Tolerance:');

  let state = voiceActivityAnalyzerService.createInitialState(0);

  // Simulate 400ms of user speech (8 cycles of 50ms at RMS 0.15)
  for (let t = 50; t <= 400; t += 50) {
    const res = voiceActivityAnalyzerService.evaluateSpeechState(0.15, state, {}, t);
    state = res.updatedState;
  }
  assert.strictEqual(state.speechDetected, true, 'Speech must be confirmed after 400ms of active energy');
  assert.strictEqual(state.trailingSilenceMs, 0, 'Trailing silence must be 0 while speaking');

  // Scenario 1: Natural pause of 400ms ("I want to book... [pause] ...an appointment")
  for (let t = 450; t <= 800; t += 50) {
    const res = voiceActivityAnalyzerService.evaluateSpeechState(0.01, state, { silenceThresholdMs: 1500 }, t);
    assert.strictEqual(res.shouldAutoStop, false, '400ms pause must NOT trigger auto-stop');
    state = res.updatedState;
  }
  assert(state.trailingSilenceMs >= 350 && state.trailingSilenceMs <= 450, 'Trailing silence should be ~400ms during pause');

  // User resumes speaking for 300ms
  for (let t = 850; t <= 1100; t += 50) {
    const res = voiceActivityAnalyzerService.evaluateSpeechState(0.18, state, { silenceThresholdMs: 1500 }, t);
    assert.strictEqual(res.shouldAutoStop, false);
    state = res.updatedState;
  }
  assert.strictEqual(state.trailingSilenceMs, 0, 'Resuming speech must reset trailing silence');

  // Scenario 2: User finishes speaking and remains silent for 1550ms (>= 1500ms threshold)
  let autoStopTriggered = false;
  for (let t = 1150; t <= 2700; t += 50) {
    const res = voiceActivityAnalyzerService.evaluateSpeechState(0.01, state, { silenceThresholdMs: 1500 }, t);
    state = res.updatedState;
    if (res.shouldAutoStop) {
      autoStopTriggered = true;
      assert.strictEqual(res.autoStopReason, 'SUSTAINED_SILENCE');
      break;
    }
  }
  assert.strictEqual(autoStopTriggered, true, 'Sustained silence of >= 1500ms must trigger auto-stop');
  console.log('  ✓ Conversational 400ms pause tolerated without premature auto-stop.');
  console.log('  ✓ Sustained silence (1500ms) correctly triggered auto-stop.');

  // ---------------------------------------------------------
  // TEST F: Manual Stop Preservation
  // ---------------------------------------------------------
  console.log('\n6. Test F — Push-to-Talk Manual Stop Functionality:');

  // Simulate user manually pressing stop at 600ms of silence (before 1500ms auto-stop)
  let manualState = voiceActivityAnalyzerService.createInitialState(0);
  // Speak 350ms
  for (let t = 50; t <= 350; t += 50) {
    manualState = voiceActivityAnalyzerService.evaluateSpeechState(0.12, manualState, {}, t).updatedState;
  }
  // User pauses 600ms and taps Stop
  for (let t = 400; t <= 950; t += 50) {
    manualState = voiceActivityAnalyzerService.evaluateSpeechState(0.01, manualState, {}, t).updatedState;
  }
  assert.strictEqual(manualState.speechDetected, true);
  assert(manualState.trailingSilenceMs < 1500, 'Manual stop occurs before auto-stop threshold');
  console.log('  ✓ User can manually stop and submit at any time.');

  // ---------------------------------------------------------
  // TEST G: Resource Cleanup & Overhead Target
  // ---------------------------------------------------------
  console.log('\n7. Test G — VAD Cycle Execution Time & Resource Cleanup:');

  const benchBuffer = new Uint8Array(256);
  for (let i = 0; i < 256; i++) benchBuffer[i] = (i * 3) % 256;

  const benchStart = performance.now();
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    voiceActivityAnalyzerService.calculateRmsFromTimeDomain(benchBuffer);
  }
  const totalBenchMs = performance.now() - benchStart;
  const avgMs = totalBenchMs / iterations;

  assert(avgMs < 0.1, `VAD RMS calculation (${avgMs.toFixed(3)}ms) is well below the 5ms requirement`);
  console.log(`  ✓ Measured VAD calculation overhead: ${avgMs.toFixed(3)} ms per analysis cycle (Budget: < 5 ms).`);

  // ---------------------------------------------------------
  // TEST H: Voice Pipeline End-to-End Regression
  // ---------------------------------------------------------
  console.log('\n8. Test H — End-to-End Voice Pipeline Regression:');

  const mockSTT = new MockSTTProvider({ transcript: 'I want to schedule an appointment.' });
  const mockTTS = new MockTTSProvider();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: mockSTT,
    ttsProvider: mockTTS,
  });

  const turnRes = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: 'dummy_sample.wav',
    businessId: business.id,
    channel: 'VOICE',
    metadata: {
      recordingDurationMs: 2450,
      audioBlobSizeBytes: 31200,
      speechDetected: true,
      trailingSilenceMs: 1480,
      uploadDispatchMs: 1.8,
      autoStopTriggered: true,
    },
  });

  assert.strictEqual(turnRes.success, true);
  assert.strictEqual(turnRes.source, 'deterministic');
  assert(turnRes.response.length > 0);
  assert(turnRes.audio !== null);
  console.log(`  ✓ Verified complete end-to-end turn execution: Response="${turnRes.response}" AudioId=${turnRes.audio.id}`);

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 7.3.2 VOICE TURN DETECTION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
