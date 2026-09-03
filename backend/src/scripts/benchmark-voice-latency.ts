import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { prisma } from '../lib/prisma';
import { voiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { speechConfig } from '../modules/speech/speech.config';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';

/**
 * Helper to synthesize realistic spoken WAV audio for benchmark turns
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

interface BenchmarkTurnResult {
  scenario: string;
  transcript: string;
  source: string;
  audioInputMs: number;
  sttMs: number;
  convMs: number;
  ttsMs: number;
  totalMs: number;
}

export async function runVoiceLatencyBenchmark(): Promise<void> {
  console.log('\n================================================================');
  console.log('⚡ REAL VOICE CONVERSATION LATENCY BENCHMARK');
  console.log('================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Memory:   ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB RAM`);
  console.log(`Platform: Windows 11 | Node.js ${process.version}`);
  console.log(`Engines:  whisper.cpp (${speechConfig.stt.modelName}) + Piper (${speechConfig.tts.modelName}) + Ollama llama3.2:3b`);
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

  const benchmarkResults: BenchmarkTurnResult[] = [];
  const tempAudioPath = path.resolve(speechConfig.paths.runtimeDir, 'bench_input.wav');

  try {
    // -------------------------------------------------------------
    // SCENARIO A: Deterministic Fast Path ("I want to book an appointment")
    // -------------------------------------------------------------
    console.log('▶ Running Scenario A: Deterministic Voice Request...');
    createInputAudio('I want to book an appointment.', tempAudioPath);
    const resA = await voiceConversationOrchestrator.orchestrateVoiceTurn({
      audioFilePath: tempAudioPath,
      businessId: business.id,
      channel: 'VOICE',
    });
    benchmarkResults.push({
      scenario: 'Scenario A: Deterministic Fast Path',
      transcript: resA.transcript,
      source: resA.source,
      audioInputMs: resA.metrics.audioInputProcessingMs,
      sttMs: resA.metrics.sttLatencyMs,
      convMs: resA.metrics.conversationLatencyMs,
      ttsMs: resA.metrics.ttsLatencyMs,
      totalMs: resA.metrics.totalPipelineLatencyMs,
    });

    // -------------------------------------------------------------
    // SCENARIO B: Database Tool Request ("What services do you offer?")
    // -------------------------------------------------------------
    console.log('▶ Running Scenario B: Database Tool Request...');
    createInputAudio('What services do you offer?', tempAudioPath);
    const resB = await voiceConversationOrchestrator.orchestrateVoiceTurn({
      audioFilePath: tempAudioPath,
      businessId: business.id,
      channel: 'VOICE',
    });
    benchmarkResults.push({
      scenario: 'Scenario B: Database Tool Request',
      transcript: resB.transcript,
      source: resB.source,
      audioInputMs: resB.metrics.audioInputProcessingMs,
      sttMs: resB.metrics.sttLatencyMs,
      convMs: resB.metrics.conversationLatencyMs,
      ttsMs: resB.metrics.ttsLatencyMs,
      totalMs: resB.metrics.totalPipelineLatencyMs,
    });

    // -------------------------------------------------------------
    // SCENARIO C: Multi-Turn Booking Workflow (6 Spoken Turns)
    // -------------------------------------------------------------
    console.log('▶ Running Scenario C: Multi-Turn Voice Booking Workflow (6 turns)...');
    let multiTurnSessionId: string | undefined = undefined;
    let createdAppointmentId: string | null = null;

    const bookingTurns = [
      { text: 'I want to book an appointment.', label: 'Turn 1: Booking Intent' },
      { text: 'Comprehensive Oral Exam and Digital X-Rays', label: 'Turn 2: Service Selection' },
      { text: 'Anyone is fine', label: 'Turn 3: Staff Preference' },
      { text: 'Tomorrow', label: 'Turn 4: Date Preference' },
      { text: '09:00 AM', label: 'Turn 5: Slot Selection' },
      { text: 'Yes, please confirm my booking', label: 'Turn 6: Confirmation' },
    ];

    for (const turn of bookingTurns) {
      createInputAudio(turn.text, tempAudioPath);
      const turnRes = await voiceConversationOrchestrator.orchestrateVoiceTurn({
        audioFilePath: tempAudioPath,
        businessId: business.id,
        sessionId: multiTurnSessionId,
        customerId: customer?.id,
        channel: 'VOICE',
      });
      multiTurnSessionId = turnRes.sessionId;
      benchmarkResults.push({
        scenario: `Scenario C (${turn.label})`,
        transcript: turnRes.transcript,
        source: turnRes.source,
        audioInputMs: turnRes.metrics.audioInputProcessingMs,
        sttMs: turnRes.metrics.sttLatencyMs,
        convMs: turnRes.metrics.conversationLatencyMs,
        ttsMs: turnRes.metrics.ttsLatencyMs,
        totalMs: turnRes.metrics.totalPipelineLatencyMs,
      });
    }

    // Clean up created appointment
    const createdAppt = await prisma.appointment.findFirst({
      where: { customerId: customer?.id, businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    if (createdAppt) {
      createdAppointmentId = createdAppt.id;
      await prisma.appointment.delete({ where: { id: createdAppointmentId } }).catch(() => {});
    }

    // -------------------------------------------------------------
    // SCENARIO D: LLM Fallback Request (Open-Ended AI Question)
    // -------------------------------------------------------------
    console.log('▶ Running Scenario D: LLM Fallback Request (Ollama llama3.2:3b)...');
    createInputAudio('What is your philosophy on gentle dental care?', tempAudioPath);
    const resD = await voiceConversationOrchestrator.orchestrateVoiceTurn({
      audioFilePath: tempAudioPath,
      businessId: business.id,
      channel: 'VOICE',
    });
    benchmarkResults.push({
      scenario: 'Scenario D: LLM Fallback (Ollama)',
      transcript: resD.transcript,
      source: resD.source,
      audioInputMs: resD.metrics.audioInputProcessingMs,
      sttMs: resD.metrics.sttLatencyMs,
      convMs: resD.metrics.conversationLatencyMs,
      ttsMs: resD.metrics.ttsLatencyMs,
      totalMs: resD.metrics.totalPipelineLatencyMs,
    });

    // -------------------------------------------------------------
    // BENCHMARK SUMMARY REPORT
    // -------------------------------------------------------------
    console.log('\n================================================================================================================');
    console.log('📊 REAL MEASURED VOICE PIPELINE LATENCIES (Intel Core i5-1235U)');
    console.log('================================================================================================================');
    console.log(
      'Scenario / Turn'.padEnd(38) +
      'Source'.padEnd(16) +
      'Input'.padEnd(10) +
      'STT (ms)'.padEnd(12) +
      'Conv (ms)'.padEnd(12) +
      'TTS (ms)'.padEnd(12) +
      'Total (ms)'
    );
    console.log('-'.repeat(112));

    for (const r of benchmarkResults) {
      console.log(
        r.scenario.padEnd(38) +
        r.source.padEnd(16) +
        `${r.audioInputMs.toFixed(1)}ms`.padEnd(10) +
        `${r.sttMs.toFixed(1)}ms`.padEnd(12) +
        `${r.convMs.toFixed(1)}ms`.padEnd(12) +
        `${r.ttsMs.toFixed(1)}ms`.padEnd(12) +
        `${r.totalMs.toFixed(1)}ms (~${(r.totalMs / 1000).toFixed(2)}s)`
      );
    }
    console.log('================================================================================================================\n');

  } finally {
    try {
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    } catch {}
  }
}

if (require.main === module) {
  runVoiceLatencyBenchmark()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
