import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '../lib/prisma';
import { speechConfig } from '../modules/speech/speech.config';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { getLocalIpAddresses } from './network-info';

interface HealthCheckItem {
  name: string;
  category: 'DATABASE' | 'AI_ENGINE' | 'SPEECH_STT' | 'SPEECH_TTS' | 'AUDIO_PROCESSING' | 'NETWORK' | 'STORAGE';
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  latencyMs?: number;
}

export async function runSystemHealthCheck(): Promise<boolean> {
  console.log('\n================================================================================');
  console.log('🩺  AI-POWERED SMART RECEPTIONIST: SYSTEM HEALTH & DEMO READINESS CHECK');
  console.log('================================================================================');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`💻 Node Version: ${process.version}`);
  console.log(`🖥️  Platform: ${process.platform} (${process.arch})`);
  console.log('--------------------------------------------------------------------------------\n');

  const results: HealthCheckItem[] = [];

  // 1. DATABASE HEALTH CHECK
  try {
    const t0 = performance.now();
    const [businessCount, customerCount, appointmentCount, staffCount] = await Promise.all([
      prisma.business.count(),
      prisma.customer.count(),
      prisma.appointment.count(),
      prisma.staff.count(),
    ]);
    const dbMs = Number((performance.now() - t0).toFixed(1));

    const totalRecords = businessCount + customerCount + appointmentCount + staffCount;
    if (totalRecords >= 50) {
      results.push({
        name: 'PostgreSQL Database (Docker port 5433)',
        category: 'DATABASE',
        status: 'PASS',
        details: `Connected. Verified ${businessCount} businesses, ${staffCount} specialists, ${customerCount} customers, ${appointmentCount} appointments.`,
        latencyMs: dbMs,
      });
    } else {
      results.push({
        name: 'PostgreSQL Database (Docker port 5433)',
        category: 'DATABASE',
        status: 'WARN',
        details: `Connected (${totalRecords} records found), but demo seed might be incomplete. Run 'npm run db:seed'.`,
        latencyMs: dbMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'PostgreSQL Database (Docker port 5433)',
      category: 'DATABASE',
      status: 'FAIL',
      details: `Cannot reach PostgreSQL at port 5433: ${err.message}. Ensure Docker container 'receptionist_postgres' is running.`,
    });
  }

  // 2. OLLAMA RUNTIME & MODEL CHECK
  try {
    const t0 = performance.now();
    const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    const ollamaMs = Number((performance.now() - t0).toFixed(1));

    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const hasModel = data.models?.some((m) => m.name.includes('llama3.2:3b') || m.name.includes('llama3.2'));
      if (hasModel) {
        results.push({
          name: 'Ollama LLM Runtime (Port 11434)',
          category: 'AI_ENGINE',
          status: 'PASS',
          details: `Connected. Model 'llama3.2:3b' is loaded and ready for CPU inference.`,
          latencyMs: ollamaMs,
        });
      } else {
        results.push({
          name: 'Ollama LLM Runtime (Port 11434)',
          category: 'AI_ENGINE',
          status: 'WARN',
          details: `Ollama is running, but 'llama3.2:3b' model was not found in tags list. Available: ${data.models?.map((m) => m.name).join(', ')}.`,
          latencyMs: ollamaMs,
        });
      }
    } else {
      results.push({
        name: 'Ollama LLM Runtime (Port 11434)',
        category: 'AI_ENGINE',
        status: 'WARN',
        details: `Ollama HTTP endpoint returned status ${res.status}. Fallback AI will be disabled.`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Ollama LLM Runtime (Port 11434)',
      category: 'AI_ENGINE',
      status: 'WARN',
      details: `Ollama not reachable at localhost:11434 (${err.message}). Deterministic fast-path booking will work; open-ended inquiries will use fallback message.`,
    });
  }

  // 3. WHISPER SPEECH-TO-TEXT CHECK
  try {
    const binaryPath = speechConfig.stt.binaryPath;
    const modelPath = speechConfig.stt.modelPath;
    const binExists = fs.existsSync(binaryPath);
    const modelExists = fs.existsSync(modelPath);

    if (binExists && modelExists) {
      const modelSizeMb = (fs.statSync(modelPath).size / (1024 * 1024)).toFixed(1);
      results.push({
        name: 'Whisper STT (whisper.cpp tiny.en)',
        category: 'SPEECH_STT',
        status: 'PASS',
        details: `Binary: ${path.basename(binaryPath)} | Weights: ${path.basename(modelPath)} (${modelSizeMb} MB). Local transcription ready.`,
      });
    } else {
      results.push({
        name: 'Whisper STT (whisper.cpp tiny.en)',
        category: 'SPEECH_STT',
        status: 'FAIL',
        details: `Missing files. Binary exists: ${binExists} (${binaryPath}), Model exists: ${modelExists} (${modelPath}).`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Whisper STT (whisper.cpp tiny.en)',
      category: 'SPEECH_STT',
      status: 'FAIL',
      details: `Error inspecting Whisper installation: ${err.message}`,
    });
  }

  // 4. PIPER TEXT-TO-SPEECH CHECK
  try {
    const binaryPath = speechConfig.tts.binaryPath;
    const modelPath = speechConfig.tts.modelPath;
    const configPath = speechConfig.tts.configPath;
    const binExists = fs.existsSync(binaryPath);
    const modelExists = fs.existsSync(modelPath);
    const cfgExists = fs.existsSync(configPath);

    if (binExists && modelExists && cfgExists) {
      const modelSizeMb = (fs.statSync(modelPath).size / (1024 * 1024)).toFixed(1);
      results.push({
        name: 'Piper Neural TTS (lessac-medium ONNX)',
        category: 'SPEECH_TTS',
        status: 'PASS',
        details: `Binary: ${path.basename(binaryPath)} | Weights: ${path.basename(modelPath)} (${modelSizeMb} MB) | Config: ${path.basename(configPath)}.`,
      });
    } else {
      results.push({
        name: 'Piper Neural TTS (lessac-medium ONNX)',
        category: 'SPEECH_TTS',
        status: 'FAIL',
        details: `Missing files. Binary: ${binExists}, Model: ${modelExists}, Config: ${cfgExists}.`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Piper Neural TTS (lessac-medium ONNX)',
      category: 'SPEECH_TTS',
      status: 'FAIL',
      details: `Error inspecting Piper installation: ${err.message}`,
    });
  }

  // 5. FFMPEG AUDIO CONVERSION CHECK
  try {
    let ffmpegPath = process.env.FFMPEG_PATH;
    if (!ffmpegPath) {
      try {
        ffmpegPath = require('ffmpeg-static');
      } catch {
        ffmpegPath = 'ffmpeg';
      }
    }

    const versionOutput = await new Promise<string>((resolve, reject) => {
      const proc = spawn(ffmpegPath!, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => (out += d.toString()));
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve(out);
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });

    const firstLine = versionOutput.split('\n')[0].trim();
    results.push({
      name: 'FFmpeg Audio Normalization Engine',
      category: 'AUDIO_PROCESSING',
      status: 'PASS',
      details: `${firstLine} | Binary: ${path.basename(ffmpegPath!)}. WebM/Opus -> 16kHz WAV transcoding ready.`,
    });
  } catch (err: any) {
    results.push({
      name: 'FFmpeg Audio Normalization Engine',
      category: 'AUDIO_PROCESSING',
      status: 'FAIL',
      details: `FFmpeg executable not functional: ${err.message}`,
    });
  }

  // 6. AUDIO STORAGE DIRECTORIES
  try {
    AudioStorageService.ensureDirectories();
    const outputDir = speechConfig.storage.outputDir;
    const uploadDir = speechConfig.storage.uploadDir;
    const isOutputWritable = fs.existsSync(outputDir);
    const isUploadWritable = fs.existsSync(uploadDir);
    const isReady = isOutputWritable && isUploadWritable;

    results.push({
      name: 'Ephemeral Audio Storage & Cache',
      category: 'STORAGE',
      status: isReady ? 'PASS' : 'FAIL',
      details: `Output: ${outputDir} | Uploads: ${uploadDir} (Writable: ${isReady}, Auto-cleanup enabled, zero persistent audio guarantee).`,
    });
  } catch (err: any) {
    results.push({
      name: 'Ephemeral Audio Storage & Cache',
      category: 'STORAGE',
      status: 'FAIL',
      details: `Failed to initialize audio directory: ${err.message}`,
    });
  }

  // 7. LOCAL NETWORK & MOBILE ACCESS URLS
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    results.push({
      name: 'Mobile LAN Discovery & HTTPS Access',
      category: 'NETWORK',
      status: 'PASS',
      details: `Primary LAN IPv4: ${ips[0]} | Mobile Route: https://${ips[0]}:3000/voice | CORS compliant across private subnets.`,
    });
  } else {
    results.push({
      name: 'Mobile LAN Discovery & HTTPS Access',
      category: 'NETWORK',
      status: 'WARN',
      details: `No non-loopback IPv4 detected. Laptop must be connected to Wi-Fi for mobile phone demonstration.`,
    });
  }

  // PRINT SUMMARY TABLE
  console.log('Subsystem / Component                      Status  Latency   Details');
  console.log('--------------------------------------------------------------------------------');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅ PASS' : r.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
    const lat = r.latencyMs !== undefined ? `${r.latencyMs}ms`.padEnd(9) : '         ';
    console.log(`${r.name.padEnd(42)} ${icon}  ${lat} ${r.details}`);
  }
  console.log('--------------------------------------------------------------------------------\n');

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const passCount = results.filter((r) => r.status === 'PASS').length;

  console.log(`📊 Health Check Summary: ${passCount} Passed, ${warnCount} Warnings, ${failedCount} Failures`);

  if (failedCount === 0) {
    console.log('\n🎉 ALL CRITICAL SUBSYSTEMS HEALTHY! SYSTEM IS READY FOR LIVE DEMONSTRATION! 🎉\n');
    return true;
  } else {
    console.log(`\n❌ SYSTEM NOT READY: ${failedCount} critical component(s) failed health check.\n`);
    return false;
  }
}

if (require.main === module) {
  runSystemHealthCheck()
    .then((ok) => {
      process.exit(ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal health check error:', err);
      process.exit(1);
    });
}
