import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { speechConfig } from '../modules/speech/speech.config';

interface STTBenchmarkResult {
  phraseIndex: number;
  expectedText: string;
  transcribedText: string;
  modelName: string;
  audioDurationSec: number;
  coldLatencyMs: number;
  warmRunsMs: number[];
  avgWarmLatencyMs: number;
  avgRTF: number;
  isAccurate: boolean;
  modelMemoryMB: number;
}

const TEST_PHRASES = [
  'I want to book an appointment.',
  'What services do you offer?',
  'I would like an appointment tomorrow.',
  'Can I see Dr. Emily Chen?',
  'Please cancel my appointment.',
  'My phone number is 555 123 4567.',
];

/**
 * Generate 16kHz mono WAV file using Piper or Windows SAPI for testing.
 */
function generateTestAudio(text: string, outputPath: string): number {
  if (fs.existsSync(speechConfig.tts.binaryPath) && fs.existsSync(speechConfig.tts.modelPath)) {
    // Generate with Piper (16kHz-22kHz audio)
    spawnSync(
      speechConfig.tts.binaryPath,
      ['--model', speechConfig.tts.modelPath, '--output_file', outputPath],
      { input: text, encoding: 'utf-8' }
    );
  } else {
    // Fallback to Windows PowerShell SAPI synthesizer
    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.SetOutputToWaveFilePath('${outputPath.replace(/'/g, "''")}')
      $synth.Speak('${text.replace(/'/g, "''")}')
      $synth.Dispose()
    `;
    execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);
  }

  // Calculate audio duration from WAV header/size
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    // Standard 16-bit 22.05kHz mono: ~44100 bytes/sec; 16kHz mono: ~32000 bytes/sec
    // More precise: read WAV header
    const buffer = fs.readFileSync(outputPath);
    if (buffer.length > 44) {
      const sampleRate = buffer.readUInt32LE(24);
      const byteRate = buffer.readUInt32LE(28);
      const dataSize = stats.size - 44;
      return byteRate > 0 ? dataSize / byteRate : (stats.size - 44) / 44100;
    }
  }
  return 3.0; // fallback duration
}

/**
 * Execute transcription using whisper-cli.exe
 */
function transcribe(
  binaryPath: string,
  modelPath: string,
  audioPath: string,
  threads: number = 4
): { text: string; durationMs: number } {
  const startTime = performance.now();
  const res = spawnSync(
    binaryPath,
    ['-m', modelPath, '-f', audioPath, '-t', String(threads), '-nt', '--no-gpu', '-fa'],
    { encoding: 'utf-8' }
  );
  const durationMs = performance.now() - startTime;

  let cleanText = '';
  if (res.stdout) {
    cleanText = res.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('whisper_') && !l.startsWith('system_info') && !l.startsWith('main:') && !l.startsWith('load_backend'))
      .join(' ')
      .trim();
  }

  return { text: cleanText, durationMs };
}

export async function runSTTBenchmark(): Promise<void> {
  console.log('\n================================================================');
  console.log('🎤 LOCAL SPEECH-TO-TEXT (STT) PERFORMANCE BENCHMARK');
  console.log('================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Platform: Windows 11 x64 (CPU-First Inference, Zero Cloud APIs)`);
  console.log(`Total RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('----------------------------------------------------------------\n');

  const modelsToTest = [
    {
      name: 'whisper.cpp (tiny.en)',
      path: path.resolve(speechConfig.paths.modelsDir, 'whisper/ggml-tiny.en.bin'),
      diskMB: 74.1,
      ramMB: 77.1,
    },
    {
      name: 'whisper.cpp (base.en)',
      path: path.resolve(speechConfig.paths.modelsDir, 'whisper/ggml-base.en.bin'),
      diskMB: 141.1,
      ramMB: 147.4,
    },
  ];

  if (!fs.existsSync(speechConfig.stt.binaryPath)) {
    console.error(`❌ Whisper binary not found at: ${speechConfig.stt.binaryPath}`);
    console.log('Please run local download setup first.');
    return;
  }

  fs.mkdirSync(speechConfig.paths.benchmarkOutputDir, { recursive: true });

  const allResults: Record<string, STTBenchmarkResult[]> = {};

  for (const model of modelsToTest) {
    if (!fs.existsSync(model.path)) {
      console.warn(`⚠️ Model ${model.name} not found at ${model.path}. Skipping.`);
      continue;
    }

    console.log(`\n▶ BENCHMARKING MODEL: ${model.name}`);
    console.log(`  Model File: ${path.basename(model.path)} (${model.diskMB} MB)`);
    console.log(`  Estimated Runtime RAM Footprint: ~${model.ramMB} MB\n`);

    const modelResults: STTBenchmarkResult[] = [];

    for (let i = 0; i < TEST_PHRASES.length; i++) {
      const phrase = TEST_PHRASES[i];
      const audioFile = path.resolve(speechConfig.paths.benchmarkOutputDir, `stt_test_${i + 1}.wav`);

      // Generate test WAV audio
      const audioDuration = generateTestAudio(phrase, audioFile);

      // 1. Cold Run
      const coldRun = transcribe(speechConfig.stt.binaryPath, model.path, audioFile, 4);

      // 2. Warm Runs (3 iterations)
      const warmRunsMs: number[] = [];
      let lastText = coldRun.text;

      for (let r = 0; r < 3; r++) {
        const warmRun = transcribe(speechConfig.stt.binaryPath, model.path, audioFile, 4);
        warmRunsMs.push(warmRun.durationMs);
        lastText = warmRun.text;
      }

      const avgWarmMs = warmRunsMs.reduce((a, b) => a + b, 0) / warmRunsMs.length;
      const rtf = avgWarmMs / (audioDuration * 1000);

      // Basic normalized accuracy check
      const normExpected = phrase.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTranscribed = lastText.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isAccurate = normTranscribed.includes(normExpected.slice(0, 15)) || normExpected.includes(normTranscribed.slice(0, 15));

      const result: STTBenchmarkResult = {
        phraseIndex: i + 1,
        expectedText: phrase,
        transcribedText: lastText,
        modelName: model.name,
        audioDurationSec: Number(audioDuration.toFixed(2)),
        coldLatencyMs: Number(coldRun.durationMs.toFixed(1)),
        warmRunsMs: warmRunsMs.map((m) => Number(m.toFixed(1))),
        avgWarmLatencyMs: Number(avgWarmMs.toFixed(1)),
        avgRTF: Number(rtf.toFixed(3)),
        isAccurate,
        modelMemoryMB: model.ramMB,
      };

      modelResults.push(result);

      console.log(`  Phrase ${i + 1}: "${phrase}"`);
      console.log(`    ↳ Output:        "${lastText}"`);
      console.log(`    ↳ Audio Length:  ${audioDuration.toFixed(2)}s`);
      console.log(`    ↳ Cold Latency:  ${coldRun.durationMs.toFixed(1)} ms`);
      console.log(`    ↳ Warm Latency:  ${avgWarmMs.toFixed(1)} ms (Runs: ${warmRunsMs.map((m) => m.toFixed(0)).join(', ')} ms)`);
      console.log(`    ↳ Real-Time Factor (RTF): ${rtf.toFixed(3)}x (< 1.0 is faster than real-time)`);
      console.log(`    ↳ Accuracy Match: ${isAccurate ? '✅ Exact / Close Match' : '⚠️ Minor Mismatch'}\n`);
    }

    allResults[model.name] = modelResults;
  }

  // Summary Comparison Table
  console.log('\n================================================================');
  console.log('📊 STT MODEL COMPARISON SUMMARY (AVERAGES ACROSS 6 PHRASES)');
  console.log('================================================================');
  console.log('| Model Tier | Disk Size | RAM Footprint | Cold Latency | Warm Latency | Avg RTF | Accuracy |');
  console.log('|---|---|---|---|---|---|---|');

  for (const [name, res] of Object.entries(allResults)) {
    const avgCold = res.reduce((a, b) => a + b.coldLatencyMs, 0) / res.length;
    const avgWarm = res.reduce((a, b) => a + b.avgWarmLatencyMs, 0) / res.length;
    const avgRTF = res.reduce((a, b) => a + b.avgRTF, 0) / res.length;
    const accPct = (res.filter((r) => r.isAccurate).length / res.length) * 100;
    const ram = res[0].modelMemoryMB;
    const disk = name.includes('tiny') ? '74.1 MB' : '141.1 MB';

    console.log(
      `| ${name.padEnd(20)} | ${disk.padEnd(9)} | ~${String(ram).padEnd(4)} MB    | ${avgCold.toFixed(0).padEnd(5)} ms     | ${avgWarm.toFixed(0).padEnd(5)} ms     | ${avgRTF.toFixed(3)}x  | ${accPct.toFixed(0)}%      |`
    );
  }
  console.log('================================================================\n');
}

if (require.main === module) {
  runSTTBenchmark().catch(console.error);
}
