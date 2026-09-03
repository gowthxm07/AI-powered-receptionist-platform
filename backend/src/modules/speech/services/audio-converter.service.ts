import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { speechConfig } from '../speech.config';

let ffmpegExecutable: string | null = null;
try {
  ffmpegExecutable = require('ffmpeg-static');
} catch {
  ffmpegExecutable = 'ffmpeg';
}

export interface AudioConversionResult {
  success: boolean;
  outputPath: string;
  converted: boolean;
  latencyMs: number;
  originalFormat: string;
  originalSizeBytes: number;
  outputSizeBytes: number;
  error?: string;
}

export class AudioConverterService {
  private ffmpegPath: string;

  constructor(ffmpegPath?: string) {
    this.ffmpegPath = ffmpegPath || process.env.FFMPEG_PATH || ffmpegExecutable || 'ffmpeg';
  }

  /**
   * Determine if the file is already a valid 16kHz Mono 16-bit PCM WAV file.
   */
  public is16kMonoPcmWav(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;

    try {
      const stats = fs.statSync(filePath);
      if (stats.size < 44) return false;

      const fd = fs.openSync(filePath, 'r');
      const header = Buffer.alloc(44);
      fs.readSync(fd, header, 0, 44, 0);
      fs.closeSync(fd);

      // Check RIFF header & WAVE tag
      if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
        return false;
      }

      // Check audio format (1 = PCM)
      const audioFormat = header.readUInt16LE(20);
      const numChannels = header.readUInt16LE(22);
      const sampleRate = header.readUInt32LE(24);
      const bitsPerSample = header.readUInt16LE(34);

      return audioFormat === 1 && numChannels === 1 && sampleRate === 16000 && bitsPerSample === 16;
    } catch {
      return false;
    }
  }

  /**
   * Convert any input audio (WebM, Opus, Ogg, MP4, AAC, or arbitrary WAV) into 16kHz Mono 16-bit PCM WAV.
   * If the input is already in 16kHz mono PCM WAV format, it passes through with 0ms conversion overhead.
   */
  public async convertTo16kMonoWav(
    inputFilePath: string,
    customOutputPath?: string
  ): Promise<AudioConversionResult> {
    const startTime = performance.now();

    if (!fs.existsSync(inputFilePath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        outputPath: inputFilePath,
        converted: false,
        latencyMs,
        originalFormat: 'unknown',
        originalSizeBytes: 0,
        outputSizeBytes: 0,
        error: `Input audio file does not exist: ${path.basename(inputFilePath)}`,
      };
    }

    const fileStats = fs.statSync(inputFilePath);
    const originalSizeBytes = fileStats.size;
    const originalExt = path.extname(inputFilePath).toLowerCase().replace('.', '') || 'unknown';

    if (originalSizeBytes === 0) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        outputPath: inputFilePath,
        converted: false,
        latencyMs,
        originalFormat: originalExt,
        originalSizeBytes: 0,
        outputSizeBytes: 0,
        error: 'Input audio file is empty (0 bytes).',
      };
    }

    // 1. Fast Path: Audio is already 16kHz mono 16-bit PCM WAV
    if (this.is16kMonoPcmWav(inputFilePath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: true,
        outputPath: inputFilePath,
        converted: false,
        latencyMs,
        originalFormat: 'wav (16kHz mono)',
        originalSizeBytes,
        outputSizeBytes: originalSizeBytes,
      };
    }

    // 2. Conversion Path: Invoke local FFmpeg to convert to 16kHz mono PCM WAV
    const outputDir = path.dirname(inputFilePath);
    const uniqueName = `conv_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.wav`;
    const outputPath = customOutputPath || path.resolve(outputDir, uniqueName);

    return new Promise<AudioConversionResult>((resolve) => {
      const args = [
        '-y',               // overwrite output file
        '-i', inputFilePath,// input file
        '-ar', '16000',     // 16kHz sampling rate required by whisper.cpp
        '-ac', '1',         // 1 channel (mono)
        '-c:a', 'pcm_s16le',// 16-bit linear PCM
        outputPath,
      ];

      let stderrData = '';
      const proc = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      proc.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      proc.on('error', (err) => {
        const latencyMs = Number((performance.now() - startTime).toFixed(2));
        resolve({
          success: false,
          outputPath: inputFilePath,
          converted: false,
          latencyMs,
          originalFormat: originalExt,
          originalSizeBytes,
          outputSizeBytes: 0,
          error: `Failed to spawn FFmpeg process: ${err.message}`,
        });
      });

      proc.on('close', (code) => {
        const latencyMs = Number((performance.now() - startTime).toFixed(2));

        if (code !== 0 || !fs.existsSync(outputPath)) {
          resolve({
            success: false,
            outputPath: inputFilePath,
            converted: false,
            latencyMs,
            originalFormat: originalExt,
            originalSizeBytes,
            outputSizeBytes: 0,
            error: `FFmpeg conversion failed with exit code ${code}. ${stderrData.slice(0, 250)}`,
          });
          return;
        }

        const outStats = fs.statSync(outputPath);
        resolve({
          success: true,
          outputPath,
          converted: true,
          latencyMs,
          originalFormat: originalExt,
          originalSizeBytes,
          outputSizeBytes: outStats.size,
        });
      });
    });
  }

  /**
   * Safely delete a temporary file.
   */
  public static safeUnlink(filePath?: string | null): void {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }
}

export const audioConverterService = new AudioConverterService();
