import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { voiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
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

export async function runVoiceTransportBenchmark(): Promise<void> {
  console.log('\n================================================================================================');
  console.log('⚡ VOICE TRANSPORT OVERHEAD & PERFORMANCE BENCHMARK');
  console.log('   Comparing Direct Voice Pipeline vs. Real-Time Transport Layer');
  console.log('================================================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Memory:   ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB RAM`);
  console.log(`Platform: Windows 11 | Node.js ${process.version}`);
  console.log('------------------------------------------------------------------------------------------------\n');

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

  const tempAudioPath = path.resolve(speechConfig.paths.runtimeDir, 'bench_transport_input.wav');

  try {
    // 1. Measure Session Setup Overhead
    console.log('▶ 1. Measuring Transport Session Setup Latency:');
    const setupStart = performance.now();
    const sessionRes = await voiceTransportSessionManager.createTransportSession({
      businessId: business.id,
      customerId: customer?.id,
      channel: 'MOBILE_WEB',
    });
    const sessionSetupMs = Number((performance.now() - setupStart).toFixed(2));
    console.log(`   ↳ Transport Session Setup Latency: ${sessionSetupMs} ms\n`);

    const transportSessionId = sessionRes.session?.transportSessionId;

    // 2. Scenario 1: Direct Voice Pipeline (Baseline)
    console.log('▶ 2. Executing Direct Voice Pipeline (Baseline)...');
    createInputAudio('I want to book an appointment.', tempAudioPath);
    const directResult = await voiceConversationOrchestrator.orchestrateVoiceTurn({
      audioFilePath: tempAudioPath,
      businessId: business.id,
      channel: 'VOICE',
    });

    // 3. Scenario 2: Transport Layer Voice Turn
    console.log('▶ 3. Executing Real-Time Voice Transport Turn...');
    const transportResult = await voiceTurnTransportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer?.id,
      audioFilePath: tempAudioPath,
      clientChannel: 'MOBILE_WEB',
    });

    // 4. Scenario 3: Database Catalog Tool via Transport
    console.log('▶ 4. Executing Database Catalog Tool via Transport Layer...');
    createInputAudio('What services do you offer?', tempAudioPath);
    const transportToolResult = await voiceTurnTransportService.processVoiceTurn({
      transportSessionId,
      businessId: business.id,
      customerId: customer?.id,
      audioFilePath: tempAudioPath,
      clientChannel: 'MOBILE_WEB',
    });

    // -------------------------------------------------------------
    // BENCHMARK COMPARISON TABLE
    // -------------------------------------------------------------
    console.log('\n================================================================================================================');
    console.log('📊 DIRECT VOICE PIPELINE VS. VOICE TRANSPORT LAYER COMPARISON');
    console.log('================================================================================================================');
    console.log(
      'Execution Pipeline'.padEnd(36) +
      'Overhead (ms)'.padEnd(16) +
      'STT (ms)'.padEnd(14) +
      'Conv (ms)'.padEnd(14) +
      'TTS (ms)'.padEnd(14) +
      'Total (ms)'
    );
    console.log('-'.repeat(108));

    console.log(
      'Direct Pipeline (Baseline)'.padEnd(36) +
      '0.0 ms'.padEnd(16) +
      `${directResult.metrics.sttLatencyMs.toFixed(1)} ms`.padEnd(14) +
      `${directResult.metrics.conversationLatencyMs.toFixed(1)} ms`.padEnd(14) +
      `${directResult.metrics.ttsLatencyMs.toFixed(1)} ms`.padEnd(14) +
      `${directResult.metrics.totalPipelineLatencyMs.toFixed(1)} ms (~${(directResult.metrics.totalPipelineLatencyMs / 1000).toFixed(2)}s)`
    );

    console.log(
      'Transport Layer (Booking Intent)'.padEnd(36) +
      `${transportResult.metrics.transportOverheadMs.toFixed(1)} ms`.padEnd(16) +
      `${transportResult.metrics.sttMs.toFixed(1)} ms`.padEnd(14) +
      `${transportResult.metrics.conversationMs.toFixed(1)} ms`.padEnd(14) +
      `${transportResult.metrics.ttsMs.toFixed(1)} ms`.padEnd(14) +
      `${transportResult.metrics.totalMs.toFixed(1)} ms (~${(transportResult.metrics.totalMs / 1000).toFixed(2)}s)`
    );

    console.log(
      'Transport Layer (Database Tool)'.padEnd(36) +
      `${transportToolResult.metrics.transportOverheadMs.toFixed(1)} ms`.padEnd(16) +
      `${transportToolResult.metrics.sttMs.toFixed(1)} ms`.padEnd(14) +
      `${transportToolResult.metrics.conversationMs.toFixed(1)} ms`.padEnd(14) +
      `${transportToolResult.metrics.ttsMs.toFixed(1)} ms`.padEnd(14) +
      `${transportToolResult.metrics.totalMs.toFixed(1)} ms (~${(transportToolResult.metrics.totalMs / 1000).toFixed(2)}s)`
    );

    console.log('================================================================================================================');
    console.log(`🎯 Transport Overhead Target (< 50 ms): ${transportResult.metrics.transportOverheadMs < 50 ? '✅ PASSED' : '⚠️ HIGH'}`);
    console.log(`   ↳ Measured Transport Overhead: ${transportResult.metrics.transportOverheadMs} ms`);
    console.log('================================================================================================================\n');

  } finally {
    try {
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    } catch {}
  }
}

if (require.main === module) {
  runVoiceTransportBenchmark()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
