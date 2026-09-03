import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
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

export async function runVoiceTransportDemo(): Promise<void> {
  console.log('\n================================================================');
  console.log('🚀 REAL-TIME VOICE TRANSPORT & STREAMING DEMONSTRATION');
  console.log('   Mobile Client Transport -> Session Manager -> Voice Orchestrator');
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

  // 1. Establish Voice Transport Session
  console.log('▶ 1. Establishing Mobile Voice Transport Session:');
  const sessionRes = await voiceTransportSessionManager.createTransportSession({
    businessId: business.id,
    customerId: customer?.id,
    channel: 'MOBILE_WEB',
    clientMetadata: {
      deviceType: 'Mobile iPhone (Safari iOS 17.5)',
      clientIp: '192.168.1.45',
    },
  });

  if (!sessionRes.success || !sessionRes.session) {
    console.error('❌ Failed to establish voice transport session:', sessionRes.error);
    return;
  }

  const session = sessionRes.session;
  console.log(`   ↳ Transport Session ID:    ${session.transportSessionId}`);
  console.log(`   ↳ Mapped Conversation ID:  ${session.conversationSessionId}`);
  console.log(`   ↳ Tenant Business:         ${business.name}`);
  console.log(`   ↳ Customer Identified:     ${session.customerName || 'None'}`);
  console.log(`   ↳ Client Channel:          ${session.channel}`);
  console.log(`   ↳ Initial State:           ${session.state}\n`);

  const tempAudioPath = path.resolve(speechConfig.paths.runtimeDir, 'demo_transport_turn.wav');

  const dialogue = [
    { text: 'I want to book an appointment.', label: 'Turn 1: Booking Intent' },
    { text: 'Comprehensive Oral Exam and Digital X-Rays', label: 'Turn 2: Service Selection' },
    { text: 'Anyone is fine', label: 'Turn 3: Staff Preference' },
  ];

  try {
    for (let i = 0; i < dialogue.length; i++) {
      const turn = dialogue[i];
      console.log(`----------------------------------------------------------------`);
      console.log(`💬 VOICE TURN ${i + 1} (${turn.label}): "${turn.text}"`);
      console.log(`----------------------------------------------------------------`);

      createInputAudio(turn.text, tempAudioPath);

      const turnResult = await voiceTurnTransportService.processVoiceTurn({
        transportSessionId: session.transportSessionId,
        businessId: business.id,
        customerId: customer?.id,
        audioFilePath: tempAudioPath,
        clientChannel: 'MOBILE_WEB',
      });

      console.log(`[STT Transcript]       "${turnResult.transcript}" (${turnResult.metrics.sttMs} ms)`);
      console.log(`[AI Response Text]     "${turnResult.responseText}" (${turnResult.metrics.conversationMs} ms)`);
      console.log(`[Response Source]      ${turnResult.source} (⚡ Deterministic Zero-LLM)`);
      console.log(`[Neural Voice Audio]   ${turnResult.audio ? `✅ Ready (${turnResult.audio.url})` : 'None'} (${turnResult.metrics.ttsMs} ms)`);
      console.log(`[Transport Overhead]   ${turnResult.metrics.transportOverheadMs} ms`);
      console.log(`[Roundtrip Latency]    ${turnResult.metrics.totalMs} ms (~${(turnResult.metrics.totalMs / 1000).toFixed(2)}s)`);
      console.log(`[Conversation Step]    ${turnResult.metadata?.conversationStep}`);
    }

    // Inspect final session state
    const finalSession = await voiceTransportSessionManager.getTransportSession(session.transportSessionId);
    console.log('\n================================================================');
    console.log('🎯 FINAL VOICE TRANSPORT SESSION STATE:');
    console.log('================================================================');
    console.log(`  Transport Session:     ${finalSession?.transportSessionId}`);
    console.log(`  Conversation Session:  ${finalSession?.conversationSessionId}`);
    console.log(`  Total Turns Handled:   ${finalSession?.turnCount}`);
    console.log(`  Current State:         ${finalSession?.state}`);
    console.log('================================================================\n');

  } finally {
    try {
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    } catch {}
  }
}

if (require.main === module) {
  runVoiceTransportDemo()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
