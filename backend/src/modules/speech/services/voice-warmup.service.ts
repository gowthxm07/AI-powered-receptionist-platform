import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';
import { speechConfig } from '../speech.config';
import { PiperProvider } from '../providers/piper.provider';
import { AudioConverterService } from './audio-converter.service';

export interface WarmupResult {
  success: boolean;
  dbWarmMs: number;
  piperWarmMs: number;
  whisperVerified: boolean;
  totalWarmupMs: number;
  timestamp: number;
  error?: string;
}

export class VoiceWarmupService {
  private isWarmed = false;
  private isWarmingUp = false;
  private lastResult: WarmupResult | null = null;
  private piperProvider: PiperProvider;

  constructor(piperProvider?: PiperProvider) {
    this.piperProvider = piperProvider || new PiperProvider();
  }

  /**
   * Safe, non-blocking pre-warm of core voice pipeline components:
   * 1. PostgreSQL connection pool (avoids cold connection handshake on turn 1).
   * 2. Whisper STT runtime and model presence verification.
   * 3. Piper TTS process and ONNX weight caching via a micro-synthesis ("Ready.").
   *
   * Designed to execute once at startup or first session initialization.
   * Consumes minimal CPU and preserves 8 GB RAM stability.
   */
  public async warmup(options?: { force?: boolean }): Promise<WarmupResult> {
    if (this.isWarmed && !options?.force && this.lastResult) {
      return this.lastResult;
    }

    if (this.isWarmingUp) {
      // Return optimistic in-progress state
      return (
        this.lastResult || {
          success: true,
          dbWarmMs: 0,
          piperWarmMs: 0,
          whisperVerified: true,
          totalWarmupMs: 0,
          timestamp: Date.now(),
        }
      );
    }

    this.isWarmingUp = true;
    const startAll = performance.now();

    let dbWarmMs = 0;
    let piperWarmMs = 0;
    let whisperVerified = false;

    try {
      // 1. PostgreSQL Connection Pool Warm-up
      const dbStart = performance.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbWarmMs = Number((performance.now() - dbStart).toFixed(2));
      } catch (dbErr: any) {
        console.warn(`[Voice Warmup] DB warm-up notice: ${dbErr.message}`);
      }

      // 2. Whisper Binary & Model Verification
      const whisperBinPath = speechConfig.stt.binaryPath;
      const whisperModelPath = speechConfig.stt.modelPath;
      whisperVerified = fs.existsSync(whisperBinPath) && fs.existsSync(whisperModelPath);

      // 3. Piper TTS Micro-Synthesis Warm-up
      if (fs.existsSync(speechConfig.tts.binaryPath) && fs.existsSync(speechConfig.tts.modelPath)) {
        const piperStart = performance.now();
        const synthRes = await this.piperProvider.synthesize('Ready.', { timeoutMs: 3000 });
        piperWarmMs = Number((performance.now() - piperStart).toFixed(2));

        // Clean up temporary warmup audio file immediately
        if (synthRes.success && synthRes.audioPath) {
          AudioConverterService.safeUnlink(synthRes.audioPath);
        }
      }

      const totalWarmupMs = Number((performance.now() - startAll).toFixed(2));
      this.isWarmed = true;

      this.lastResult = {
        success: true,
        dbWarmMs,
        piperWarmMs,
        whisperVerified,
        totalWarmupMs,
        timestamp: Date.now(),
      };

      console.log(
        `[Voice Warmup] Pipeline warmed in ${totalWarmupMs}ms (db=${dbWarmMs}ms, piper=${piperWarmMs}ms, whisperOk=${whisperVerified})`
      );

      return this.lastResult;
    } catch (err: any) {
      const totalWarmupMs = Number((performance.now() - startAll).toFixed(2));
      this.lastResult = {
        success: false,
        dbWarmMs,
        piperWarmMs,
        whisperVerified,
        totalWarmupMs,
        timestamp: Date.now(),
        error: err.message,
      };
      return this.lastResult;
    } finally {
      this.isWarmingUp = false;
    }
  }

  public getStatus(): { isWarmed: boolean; lastResult: WarmupResult | null } {
    return {
      isWarmed: this.isWarmed,
      lastResult: this.lastResult,
    };
  }

  public reset(): void {
    this.isWarmed = false;
    this.isWarmingUp = false;
    this.lastResult = null;
  }
}

export const voiceWarmupService = new VoiceWarmupService();
