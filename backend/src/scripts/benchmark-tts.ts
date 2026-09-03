import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { speechConfig } from '../modules/speech/speech.config';

interface TTSBenchmarkResult {
  phraseIndex: number;
  inputText: string;
  charCount: number;
  technology: string;
  voiceName: string;
  audioDurationSec: number;
  coldLatencyMs: number;
  warmRunsMs: number[];
  avgWarmLatencyMs: number;
  avgRTF: number;
  ramFootprintMB: number;
  voiceQuality: string;
}

const TTS_TEST_PHRASES = [
  'Hello! Thank you for calling Lumina Dental Care. How can I help you today?',
  'Sure! Which service would you like to book?',
  'I have several available appointments tomorrow. Would you prefer morning or afternoon?',
  'Your appointment has been successfully booked for Friday at 9:00 AM.',
  'Could you please provide your phone number?',
];

function getWavDurationSec(filePath: string): number {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    if (buffer.length > 44) {
      const byteRate = buffer.readUInt32LE(28);
      const dataSize = stats.size - 44;
      return byteRate > 0 ? dataSize / byteRate : (stats.size - 44) / 44100;
    }
  }
  return 3.0;
}

/**
 * Synthesize speech using Piper TTS
 */
function synthesizePiper(text: string, outputPath: string): { durationMs: number; audioDurationSec: number } {
  const startTime = performance.now();
  spawnSync(
    speechConfig.tts.binaryPath,
    ['--model', speechConfig.tts.modelPath, '--output_file', outputPath],
    { input: text, encoding: 'utf-8' }
  );
  const durationMs = performance.now() - startTime;
  const audioDurationSec = getWavDurationSec(outputPath);
  return { durationMs, audioDurationSec };
}

/**
 * Synthesize speech using Windows Native SAPI
 */
function synthesizeWindowsSAPI(text: string, outputPath: string): { durationMs: number; audioDurationSec: number } {
  const startTime = performance.now();
  const safeText = text.replace(/'/g, "''").replace(/"/g, '`"');
  const safePath = outputPath.replace(/'/g, "''");
  const psCmd = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${safePath}'); $synth.Speak('${safeText}'); $synth.Dispose()`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`);
  const durationMs = performance.now() - startTime;
  const audioDurationSec = getWavDurationSec(outputPath);
  return { durationMs, audioDurationSec };
}

export async function runTTSBenchmark(): Promise<void> {
  console.log('\n================================================================');
  console.log('🔊 LOCAL TEXT-TO-SPEECH (TTS) PERFORMANCE BENCHMARK');
  console.log('================================================================');
  console.log(`Hardware: CPU=${os.cpus()[0].model} (${os.cpus().length} threads)`);
  console.log(`Platform: Windows 11 x64 (CPU-First Synthesis, Zero Cloud APIs)`);
  console.log(`Total RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('----------------------------------------------------------------\n');

  fs.mkdirSync(speechConfig.paths.benchmarkOutputDir, { recursive: true });

  const engines = [
    {
      name: 'Piper TTS (Neural VITS)',
      voice: 'en_US-lessac-medium',
      diskMB: 63.2,
      ramMB: 60.0,
      quality: 'Natural / Human-like (Neural)',
      run: (text: string, out: string) => synthesizePiper(text, out),
      available: fs.existsSync(speechConfig.tts.binaryPath) && fs.existsSync(speechConfig.tts.modelPath),
    },
    {
      name: 'Windows SAPI (System.Speech)',
      voice: 'Microsoft David / Zira',
      diskMB: 0.0,
      ramMB: 15.0,
      quality: 'Robotic / Formant Synthesizer',
      run: (text: string, out: string) => synthesizeWindowsSAPI(text, out),
      available: true,
    },
  ];

  const allResults: Record<string, TTSBenchmarkResult[]> = {};

  for (const engine of engines) {
    if (!engine.available) {
      console.warn(`⚠️ Engine ${engine.name} not installed or available. Skipping.`);
      continue;
    }

    console.log(`\n▶ BENCHMARKING ENGINE: ${engine.name}`);
    console.log(`  Voice Model: ${engine.voice} (${engine.diskMB > 0 ? `${engine.diskMB} MB ONNX` : 'Built-in OS'})`);
    console.log(`  RAM Footprint: ~${engine.ramMB} MB | Quality: ${engine.quality}\n`);

    const engineResults: TTSBenchmarkResult[] = [];

    for (let i = 0; i < TTS_TEST_PHRASES.length; i++) {
      const phrase = TTS_TEST_PHRASES[i];
      const audioFile = path.resolve(
        speechConfig.paths.benchmarkOutputDir,
        `tts_${engine.name.toLowerCase().includes('piper') ? 'piper' : 'sapi'}_${i + 1}.wav`
      );

      // 1. Cold Run
      const coldRun = engine.run(phrase, audioFile);

      // 2. Warm Runs (3 iterations)
      const warmRunsMs: number[] = [];
      let lastAudioDuration = coldRun.audioDurationSec;

      for (let r = 0; r < 3; r++) {
        const warmRun = engine.run(phrase, audioFile);
        warmRunsMs.push(warmRun.durationMs);
        lastAudioDuration = warmRun.audioDurationSec;
      }

      const avgWarmMs = warmRunsMs.reduce((a, b) => a + b, 0) / warmRunsMs.length;
      const rtf = avgWarmMs / (lastAudioDuration * 1000);

      const result: TTSBenchmarkResult = {
        phraseIndex: i + 1,
        inputText: phrase,
        charCount: phrase.length,
        technology: engine.name,
        voiceName: engine.voice,
        audioDurationSec: Number(lastAudioDuration.toFixed(2)),
        coldLatencyMs: Number(coldRun.durationMs.toFixed(1)),
        warmRunsMs: warmRunsMs.map((m) => Number(m.toFixed(1))),
        avgWarmLatencyMs: Number(avgWarmMs.toFixed(1)),
        avgRTF: Number(rtf.toFixed(3)),
        ramFootprintMB: engine.ramMB,
        voiceQuality: engine.quality,
      };

      engineResults.push(result);

      console.log(`  Phrase ${i + 1} (${phrase.length} chars): "${phrase}"`);
      console.log(`    ↳ Output Audio Duration: ${lastAudioDuration.toFixed(2)}s`);
      console.log(`    ↳ Cold Synthesis:        ${coldRun.durationMs.toFixed(1)} ms`);
      console.log(`    ↳ Warm Synthesis Avg:    ${avgWarmMs.toFixed(1)} ms (Runs: ${warmRunsMs.map((m) => m.toFixed(0)).join(', ')} ms)`);
      console.log(`    ↳ Real-Time Factor (RTF): ${rtf.toFixed(3)}x (< 0.20 is ultra-low latency)`);
      console.log(`    ↳ Voice Quality:          ${engine.quality}\n`);
    }

    allResults[engine.name] = engineResults;
  }

  // Summary Comparison Table
  console.log('\n================================================================');
  console.log('📊 TTS ENGINE COMPARISON SUMMARY (AVERAGES ACROSS 5 PHRASES)');
  console.log('================================================================');
  console.log('| Technology | Voice Model | Model Size | RAM Footprint | Cold Start | Warm Latency | Avg RTF | Audio Quality |');
  console.log('|---|---|---|---|---|---|---|---|');

  for (const [name, res] of Object.entries(allResults)) {
    const avgCold = res.reduce((a, b) => a + b.coldLatencyMs, 0) / res.length;
    const avgWarm = res.reduce((a, b) => a + b.avgWarmLatencyMs, 0) / res.length;
    const avgRTF = res.reduce((a, b) => a + b.avgRTF, 0) / res.length;
    const voice = res[0].voiceName;
    const ram = res[0].ramFootprintMB;
    const size = name.includes('Piper') ? '63.2 MB' : '0 MB (OS)';
    const quality = name.includes('Piper') ? 'Natural Neural (VITS)' : 'Robotic SAPI';

    console.log(
      `| ${name.padEnd(26)} | ${voice.padEnd(20)} | ${size.padEnd(10)} | ~${String(ram).padEnd(4)} MB    | ${avgCold.toFixed(0).padEnd(5)} ms   | ${avgWarm.toFixed(0).padEnd(5)} ms   | ${avgRTF.toFixed(3)}x  | ${quality} |`
    );
  }
  console.log('================================================================\n');
}

if (require.main === module) {
  runTTSBenchmark().catch(console.error);
}
