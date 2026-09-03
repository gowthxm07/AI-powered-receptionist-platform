import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { spawnSync } from 'child_process';
import { audioConverterService, AudioConverterService } from '../modules/speech/services/audio-converter.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { prisma } from '../lib/prisma';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { speechConfig } from '../modules/speech/speech.config';

const ffmpegStatic = require('ffmpeg-static');

async function runVerification() {
  console.log('\n===============================================================');
  console.log('🎙️ SMART RECEPTIONIST: MOBILE AUDIO & WHISPER STT VERIFICATION');
  console.log('===============================================================');

  const benchmarkWav = path.resolve(__dirname, '../../benchmark-output/stt_test_1.wav');
  assert(fs.existsSync(benchmarkWav), `Benchmark sample must exist at ${benchmarkWav}`);

  const sampleWebmPath = path.resolve(speechConfig.storage.uploadDir, `test_mobile_${Date.now()}.webm`);
  AudioStorageService.ensureDirectories();

  // 1. Synthesize a real WebM/Opus audio file simulating Android Chrome MediaRecorder
  console.log('\n1. Synthesizing Android Chrome WebM/Opus Audio:');
  const synthRes = spawnSync(ffmpegStatic, ['-y', '-i', benchmarkWav, '-c:a', 'libopus', sampleWebmPath], { encoding: 'utf8' });
  assert.strictEqual(synthRes.status, 0, 'FFmpeg must successfully synthesize WebM file');
  const webmStats = fs.statSync(sampleWebmPath);
  console.log(`   ✓ WebM file created: ${path.basename(sampleWebmPath)} (${webmStats.size} bytes)`);

  // 2. Test AudioConverterService detection & conversion
  console.log('\n2. Testing AudioConverterService Format Detection & Conversion:');
  const isPcmWav = audioConverterService.is16kMonoPcmWav(sampleWebmPath);
  assert.strictEqual(isPcmWav, false, 'WebM file must be identified as non-PCM WAV');
  console.log(`   ✓ Format check: is16kMonoPcmWav("${path.basename(sampleWebmPath)}") === false (Conversion Required)`);

  const convResult = await audioConverterService.convertTo16kMonoWav(sampleWebmPath);
  assert.strictEqual(convResult.success, true, 'Audio conversion must succeed');
  assert.strictEqual(convResult.converted, true, 'Audio must be marked as converted');
  assert(convResult.latencyMs >= 0, 'Latency must be non-negative');
  assert(fs.existsSync(convResult.outputPath), 'Converted WAV output must exist on disk');
  console.log(`   ✓ Converted to 16kHz Mono PCM WAV in ${convResult.latencyMs}ms (Size: ${convResult.outputSizeBytes} bytes)`);

  // 3. Test WhisperCppProvider on Converted Audio
  console.log('\n3. Testing Whisper Speech-to-Text on Converted Audio:');
  const whisper = new WhisperCppProvider();
  const sttRes = await whisper.transcribe(convResult.outputPath);
  assert.strictEqual(sttRes.success, true, 'Whisper transcription must succeed');
  assert(sttRes.transcript.length > 0, 'Transcript must be non-empty');
  console.log(`   ✓ Whisper STT Result: "${sttRes.transcript}" (Latency: ${sttRes.latencyMs}ms)`);

  // Clean up temporary converted file
  AudioConverterService.safeUnlink(convResult.outputPath);
  assert(!fs.existsSync(convResult.outputPath), 'Converted file must be safely unlinked');
  console.log(`   ✓ Converted temporary file cleaned up.`);

  // 4. Test Full End-to-End Voice Orchestration with WebM Input
  console.log('\n4. Testing Full Voice Orchestrator Pipeline with WebM Input:');
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist');

  const orchestrator = new VoiceConversationOrchestrator();
  const orchResult = await orchestrator.orchestrateVoiceTurn({
    audioFilePath: sampleWebmPath,
    businessId: business.id,
    channel: 'VOICE',
  });

  assert.strictEqual(orchResult.success, true, 'Voice turn orchestration must succeed');
  assert(orchResult.transcript.length > 0, 'Transcript must be non-empty');
  assert(orchResult.response.length > 0, 'AI response must be non-empty');
  assert(orchResult.audio !== null, 'Synthesized response audio must be generated');
  console.log(`   ✓ Spoken Transcript : "${orchResult.transcript}"`);
  console.log(`   ✓ AI Response       : "${orchResult.response}"`);
  console.log(`   ✓ Audio Conversion  : ${orchResult.metrics.audioConversionMs}ms`);
  console.log(`   ✓ Whisper STT Time  : ${orchResult.metrics.sttLatencyMs}ms`);
  console.log(`   ✓ AI Processing Time: ${orchResult.metrics.conversationLatencyMs}ms`);
  console.log(`   ✓ Piper TTS Time    : ${orchResult.metrics.ttsLatencyMs}ms`);
  console.log(`   ✓ Total Turn Time   : ${orchResult.metrics.totalPipelineLatencyMs}ms`);

  // 5. Test VoiceTurnTransportService with Multipart/WebM Upload
  console.log('\n5. Testing VoiceTurnTransportService Lifecycle & File Cleanup:');
  const turnResult = await voiceTurnTransportService.processVoiceTurn({
    businessId: business.id,
    audioFilePath: sampleWebmPath,
    clientChannel: 'MOBILE_WEB',
  });

  assert.strictEqual(turnResult.success, true, 'Transport turn must succeed');
  assert(turnResult.transcript.length > 0, 'Transport transcript must be non-empty');
  assert(turnResult.audio !== null, 'Transport audio response must exist');
  assert(!fs.existsSync(sampleWebmPath), 'Original uploaded WebM temporary file must be cleaned up');
  console.log(`   ✓ Transport turn completed: Source=${turnResult.source} Total=${turnResult.metrics.totalMs}ms`);
  console.log(`   ✓ Uploaded file automatically cleaned up from disk.`);

  console.log('\n===============================================================');
  console.log('🎉 ALL MOBILE AUDIO & WHISPER STT PIPELINE TESTS PASSED! 🎉');
  console.log('===============================================================\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
