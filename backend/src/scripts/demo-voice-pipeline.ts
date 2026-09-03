import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { speechPipelineService } from '../modules/speech/services/speech-pipeline.service';
import { speechConfig } from '../modules/speech/speech.config';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';

/**
 * Helper to generate a real input test WAV file using Piper or Windows SAPI
 */
function createInputAudio(text: string, outputPath: string): void {
  if (fs.existsSync(speechConfig.tts.binaryPath) && fs.existsSync(speechConfig.tts.modelPath)) {
    spawnSync(
      speechConfig.tts.binaryPath,
      ['--model', speechConfig.tts.modelPath, '--output_file', outputPath],
      { input: text, encoding: 'utf-8' }
    );
  } else {
    const safeText = text.replace(/'/g, "''").replace(/"/g, '`"');
    const safePath = outputPath.replace(/'/g, "''");
    const psCmd = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${safePath}'); $synth.Speak('${safeText}'); $synth.Dispose()`;
    execSync(`powershell -NoProfile -Command "${psCmd}"`);
  }
}

export async function runVoicePipelineDemo(): Promise<void> {
  console.log('\n================================================================');
  console.log('🎙️ LOCAL AI RECEPTIONIST VOICE PIPELINE DEMO');
  console.log('   End-to-End: Audio -> Whisper STT -> Fast Router -> Piper TTS');
  console.log('================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Memory:   ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB RAM`);
  console.log(`Runtime:  whisper.cpp (${speechConfig.stt.modelName}) + Piper (${speechConfig.tts.modelName})`);
  console.log(`Status:   100% Free, Local, Offline, Zero Cloud APIs`);
  console.log('----------------------------------------------------------------\n');

  AudioStorageService.ensureDirectories();

  // Find demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });

  if (!business) {
    console.error('❌ Demo business not found. Please run seed script first.');
    return;
  }

  // 1. Generate Input Audio for Turn 1
  const inputAudioFile = path.resolve(speechConfig.paths.runtimeDir, 'demo_booking_input.wav');
  const spokenPhrase = 'I want to book an appointment.';
  console.log(`▶ 1. Generating Sample Caller Audio: "${spokenPhrase}"`);
  createInputAudio(spokenPhrase, inputAudioFile);
  console.log(`   ↳ Caller audio saved to: ${inputAudioFile}`);

  // 2. Execute Complete Pipeline for Turn 1
  console.log('\n▶ 2. Executing Real End-to-End Voice Turn 1:');
  const turn1Result = await speechPipelineService.processVoiceTurn({
    audioFilePath: inputAudioFile,
    businessId: business.id,
    channel: 'VOICE_DEMO',
  });

  console.log('\n================================================================');
  console.log('🎯 VOICE TURN 1 RESULTS:');
  console.log('================================================================');
  console.log(`  Audio Input:           ${path.basename(inputAudioFile)}`);
  console.log(`  Transcribed Speech:    "${turn1Result.transcript}"`);
  console.log(`  STT Latency:           ${turn1Result.metrics.sttMs} ms`);
  console.log(`  AI Response:           "${turn1Result.response}"`);
  console.log(`  Execution Source:      ${turn1Result.source} (⚡ Deterministic Zero-LLM)`);
  console.log(`  Conversation Latency:  ${turn1Result.metrics.conversationMs} ms`);
  console.log(`  Generated Audio ID:    ${turn1Result.audio?.id || 'N/A'}`);
  console.log(`  TTS Latency:           ${turn1Result.metrics.ttsMs} ms`);
  console.log(`  --------------------------------------------------------------`);
  console.log(`  TOTAL PIPELINE LATENCY: ${turn1Result.metrics.totalMs} ms (~${(turn1Result.metrics.totalMs / 1000).toFixed(2)}s)`);
  console.log(`  Session ID:            ${turn1Result.sessionId}`);
  console.log('================================================================\n');

  // 3. Execute Turn 2 with session continuation
  const inputAudioTurn2 = path.resolve(speechConfig.paths.runtimeDir, 'demo_service_input.wav');
  const spokenPhraseTurn2 = 'Comprehensive Oral Exam and Digital X-Rays';
  console.log(`▶ 3. Generating Caller Turn 2 Audio: "${spokenPhraseTurn2}"`);
  createInputAudio(spokenPhraseTurn2, inputAudioTurn2);

  console.log('\n▶ 4. Executing Real End-to-End Voice Turn 2 (Session Continuation):');
  const turn2Result = await speechPipelineService.processVoiceTurn({
    audioFilePath: inputAudioTurn2,
    businessId: business.id,
    sessionId: turn1Result.sessionId,
    channel: 'VOICE_DEMO',
  });

  console.log('\n================================================================');
  console.log('🎯 VOICE TURN 2 RESULTS:');
  console.log('================================================================');
  console.log(`  Transcribed Speech:    "${turn2Result.transcript}"`);
  console.log(`  STT Latency:           ${turn2Result.metrics.sttMs} ms`);
  console.log(`  AI Response:           "${turn2Result.response}"`);
  console.log(`  Conversation Step:     ${turn2Result.metadata?.conversationStep}`);
  console.log(`  Conversation Latency:  ${turn2Result.metrics.conversationMs} ms`);
  console.log(`  TTS Latency:           ${turn2Result.metrics.ttsMs} ms`);
  console.log(`  TOTAL PIPELINE LATENCY: ${turn2Result.metrics.totalMs} ms (~${(turn2Result.metrics.totalMs / 1000).toFixed(2)}s)`);
  console.log(`  Session Preserved:     ${turn2Result.sessionId === turn1Result.sessionId ? '✅ Yes' : '❌ No'}`);
  console.log('================================================================\n');

  // Cleanup demo temporary input audio
  try {
    if (fs.existsSync(inputAudioFile)) fs.unlinkSync(inputAudioFile);
    if (fs.existsSync(inputAudioTurn2)) fs.unlinkSync(inputAudioTurn2);
  } catch {}
}

if (require.main === module) {
  runVoicePipelineDemo()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
