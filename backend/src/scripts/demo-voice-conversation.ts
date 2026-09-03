import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { voiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { speechConfig } from '../modules/speech/speech.config';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';

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

export async function runVoiceConversationDemo(): Promise<void> {
  console.log('\n================================================================');
  console.log('🎙️ INTERACTIVE VOICE RECEPTIONIST CONVERSATION DEMO');
  console.log('================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Memory:   ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB RAM`);
  console.log(`Platform: Windows 11 | CPU-Only Local Pipeline`);
  console.log('----------------------------------------------------------------\n');

  AudioStorageService.ensureDirectories();

  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    select: { id: true, name: true, phone: true },
  });

  if (!business) {
    console.error('❌ Demo business Lumina Dental Care not found.');
    return;
  }

  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
    select: { id: true, name: true, phone: true },
  });

  const tempAudioPath = path.resolve(speechConfig.paths.runtimeDir, 'demo_conv_input.wav');
  let currentSessionId: string | undefined = undefined;

  const dialogue = [
    { speaker: 'Caller', text: 'I want to book an appointment.' },
    { speaker: 'Caller', text: 'Comprehensive Oral Exam and Digital X-Rays' },
    { speaker: 'Caller', text: 'What services do you offer?' }, // Mid-flow inquiry
    { speaker: 'Caller', text: 'Anyone is fine' },             // Resumption
  ];

  try {
    for (let i = 0; i < dialogue.length; i++) {
      const turn = dialogue[i];
      console.log(`\n----------------------------------------------------------------`);
      console.log(`💬 TURN ${i + 1} - ${turn.speaker}: "${turn.text}"`);
      console.log(`----------------------------------------------------------------`);

      createInputAudio(turn.text, tempAudioPath);

      const result = await voiceConversationOrchestrator.orchestrateVoiceTurn({
        audioFilePath: tempAudioPath,
        businessId: business.id,
        sessionId: currentSessionId,
        customerId: customer?.id,
        channel: 'VOICE',
      });

      currentSessionId = result.sessionId;

      console.log(`[STT Transcript]    "${result.transcript}" (${result.metrics.sttLatencyMs} ms)`);
      console.log(`[AI Response]       "${result.response}" (${result.metrics.conversationLatencyMs} ms) [Source: ${result.source}]`);
      console.log(`[Neural TTS Audio]  ${result.audio ? `✅ Generated (ID: ${result.audio.id})` : 'None'} (${result.metrics.ttsLatencyMs} ms)`);
      console.log(`[Roundtrip Latency] ${result.metrics.totalPipelineLatencyMs} ms (~${(result.metrics.totalPipelineLatencyMs / 1000).toFixed(2)}s)`);
      console.log(`[Conversation Step] ${result.metadata?.conversationStep}`);
      console.log(`[Session Preserved] ${result.sessionId === currentSessionId ? '✅ Yes' : '❌ No'}`);
    }

    console.log('\n================================================================');
    console.log('🎉 INTERACTIVE VOICE DEMONSTRATION COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    try {
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    } catch {}
  }
}

if (require.main === module) {
  runVoiceConversationDemo()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
