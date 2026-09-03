import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { speechConfig } from '../speech.config';
import { SpeechToTextProvider, SpeechToTextResult, SpeechToTextOptions } from '../types/speech.types';

export class WhisperCppProvider implements SpeechToTextProvider {
  public readonly name = 'whisper.cpp';

  private binaryPath: string;
  private modelPath: string;
  private defaultThreads: number;
  private defaultTimeoutMs: number;

  constructor(options?: {
    binaryPath?: string;
    modelPath?: string;
    threads?: number;
    timeoutMs?: number;
  }) {
    this.binaryPath = options?.binaryPath || speechConfig.stt.binaryPath;
    this.modelPath = options?.modelPath || speechConfig.stt.modelPath;
    this.defaultThreads = options?.threads || speechConfig.stt.threads;
    this.defaultTimeoutMs = options?.timeoutMs || speechConfig.stt.timeoutMs;
  }

  /**
   * Validate audio file format and size defensively.
   */
  private validateAudioFile(filePath: string): { valid: boolean; error?: string; durationSec?: number } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `Audio file does not exist on disk: ${path.basename(filePath)}` };
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'Audio file is empty (0 bytes).' };
    }

    if (stats.size > speechConfig.stt.maxAudioSizeBytes) {
      return {
        valid: false,
        error: `Audio file exceeds maximum size of ${speechConfig.stt.maxAudioSizeBytes / 1024 / 1024} MB.`,
      };
    }

    // Inspect header for WAV files
    let durationSec = 2.0;
    try {
      const buffer = fs.readFileSync(filePath);
      if (buffer.length >= 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
        const byteRate = buffer.readUInt32LE(28);
        const dataSize = stats.size - 44;
        if (byteRate > 0) {
          durationSec = Number((dataSize / byteRate).toFixed(2));
        }
      }
    } catch {
      // Fallback duration
    }

    return { valid: true, durationSec };
  }

  /**
   * Transcribe an audio file asynchronously using the native whisper.cpp binary.
   */
  public async transcribe(
    audioFilePath: string,
    options?: SpeechToTextOptions
  ): Promise<SpeechToTextResult> {
    const startTime = performance.now();

    // 1. Verify runtime binary & model availability
    if (!fs.existsSync(this.binaryPath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        transcript: '',
        latencyMs,
        error: {
          code: 'WHISPER_BINARY_NOT_FOUND',
          message: `Whisper executable not found at: ${path.basename(this.binaryPath)}. Local speech runtime must be installed.`,
        },
      };
    }

    if (!fs.existsSync(this.modelPath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        transcript: '',
        latencyMs,
        error: {
          code: 'WHISPER_MODEL_NOT_FOUND',
          message: `Whisper model weights not found at: ${path.basename(this.modelPath)}.`,
        },
      };
    }

    // 2. Defensive Audio Validation
    const validation = this.validateAudioFile(audioFilePath);
    if (!validation.valid) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        transcript: '',
        latencyMs,
        error: {
          code: 'INVALID_AUDIO_FILE',
          message: validation.error || 'Invalid audio file format.',
        },
      };
    }

    const threads = options?.threads || this.defaultThreads;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    // 3. Asynchronous execution via child_process.spawn
    return new Promise<SpeechToTextResult>((resolve) => {
      const args = [
        '-m',
        this.modelPath,
        '-f',
        audioFilePath,
        '-t',
        String(threads),
        '-nt', // no timestamps in stdout
        '--no-gpu',
        '-fa', // flash attention acceleration
      ];

      let stdoutData = '';
      let stderrData = '';
      let isSettled = false;

      const whisperProc = spawn(this.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            whisperProc.kill();
          } catch {}
          const latencyMs = Number((performance.now() - startTime).toFixed(2));
          resolve({
            success: false,
            transcript: '',
            latencyMs,
            error: {
              code: 'STT_TIMEOUT',
              message: `Speech transcription timed out after ${timeoutMs} ms.`,
            },
          });
        }
      }, timeoutMs);

      whisperProc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      whisperProc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      whisperProc.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          const latencyMs = Number((performance.now() - startTime).toFixed(2));
          resolve({
            success: false,
            transcript: '',
            latencyMs,
            error: {
              code: 'WHISPER_PROCESS_ERROR',
              message: `Failed to spawn whisper process: ${err.message}`,
            },
          });
        }
      });

      whisperProc.on('close', (code) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          const latencyMs = Number((performance.now() - startTime).toFixed(2));

          if (code !== 0 && code !== null) {
            resolve({
              success: false,
              transcript: '',
              latencyMs,
              error: {
                code: 'WHISPER_EXECUTION_ERROR',
                message: `Whisper exited with non-zero code ${code}. ${stderrData.slice(0, 200)}`,
              },
            });
            return;
          }

          // Parse and clean stdout output
          const cleanTranscript = stdoutData
            .split('\n')
            .map((line) => line.trim())
            .filter(
              (line) =>
                line.length > 0 &&
                !line.startsWith('whisper_') &&
                !line.startsWith('system_info') &&
                !line.startsWith('main:') &&
                !line.startsWith('load_backend')
            )
            .join(' ')
            .trim();

          resolve({
            success: true,
            transcript: cleanTranscript,
            latencyMs,
            audioDurationSec: validation.durationSec,
          });
        }
      });
    });
  }
}
