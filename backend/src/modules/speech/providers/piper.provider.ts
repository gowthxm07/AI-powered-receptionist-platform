import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { speechConfig } from '../speech.config';
import { AudioStorageService } from '../services/audio-storage.service';
import { TextToSpeechProvider, TextToSpeechResult, TextToSpeechOptions } from '../types/speech.types';

export class PiperProvider implements TextToSpeechProvider {
  public readonly name = 'piper';

  private binaryPath: string;
  private modelPath: string;
  private configPath: string;
  private defaultTimeoutMs: number;

  constructor(options?: {
    binaryPath?: string;
    modelPath?: string;
    configPath?: string;
    timeoutMs?: number;
  }) {
    this.binaryPath = options?.binaryPath || speechConfig.tts.binaryPath;
    this.modelPath = options?.modelPath || speechConfig.tts.modelPath;
    this.configPath = options?.configPath || speechConfig.tts.configPath;
    this.defaultTimeoutMs = options?.timeoutMs || speechConfig.tts.timeoutMs;
  }

  /**
   * Synthesize text into high-quality neural speech using the local Piper binary asynchronously.
   */
  public async synthesize(
    text: string,
    options?: TextToSpeechOptions
  ): Promise<TextToSpeechResult> {
    const startTime = performance.now();

    // 1. Text input validation
    if (!text || text.trim().length === 0) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        audioId: '',
        audioPath: '',
        audioFileName: '',
        latencyMs,
        charCount: 0,
        error: {
          code: 'EMPTY_TEXT_ERROR',
          message: 'Cannot synthesize speech for empty text.',
        },
      };
    }

    // Defensive length bounding
    const boundedText = text.length > speechConfig.tts.maxTextLength
      ? text.slice(0, speechConfig.tts.maxTextLength)
      : text;

    // 2. Binary and model availability checks
    if (!fs.existsSync(this.binaryPath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        audioId: '',
        audioPath: '',
        audioFileName: '',
        latencyMs,
        charCount: boundedText.length,
        error: {
          code: 'PIPER_BINARY_NOT_FOUND',
          message: `Piper executable not found at: ${path.basename(this.binaryPath)}. Local speech runtime must be installed.`,
        },
      };
    }

    if (!fs.existsSync(this.modelPath)) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        audioId: '',
        audioPath: '',
        audioFileName: '',
        latencyMs,
        charCount: boundedText.length,
        error: {
          code: 'PIPER_MODEL_NOT_FOUND',
          message: `Piper voice model weights not found at: ${path.basename(this.modelPath)}.`,
        },
      };
    }

    // 3. Unique temporary output path creation
    const { audioId, fileName, fullPath } = AudioStorageService.createAudioPath('tts');
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    // 4. Asynchronous Piper execution
    return new Promise<TextToSpeechResult>((resolve) => {
      const args = [
        '--model',
        this.modelPath,
        '--output_file',
        fullPath,
      ];

      if (fs.existsSync(this.configPath)) {
        args.push('--config', this.configPath);
      }

      let stderrData = '';
      let isSettled = false;

      const piperProc = spawn(this.binaryPath, args, {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            piperProc.kill();
          } catch {}
          const latencyMs = Number((performance.now() - startTime).toFixed(2));
          resolve({
            success: false,
            audioId: '',
            audioPath: '',
            audioFileName: '',
            latencyMs,
            charCount: boundedText.length,
            error: {
              code: 'TTS_TIMEOUT',
              message: `Text-to-speech synthesis timed out after ${timeoutMs} ms.`,
            },
          });
        }
      }, timeoutMs);

      piperProc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      piperProc.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          const latencyMs = Number((performance.now() - startTime).toFixed(2));
          resolve({
            success: false,
            audioId: '',
            audioPath: '',
            audioFileName: '',
            latencyMs,
            charCount: boundedText.length,
            error: {
              code: 'PIPER_PROCESS_ERROR',
              message: `Failed to spawn Piper process: ${err.message}`,
            },
          });
        }
      });

      piperProc.on('close', (code) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          const latencyMs = Number((performance.now() - startTime).toFixed(2));

          if (code !== 0 && code !== null) {
            resolve({
              success: false,
              audioId: '',
              audioPath: '',
              audioFileName: '',
              latencyMs,
              charCount: boundedText.length,
              error: {
                code: 'PIPER_EXECUTION_ERROR',
                message: `Piper exited with code ${code}. ${stderrData.slice(0, 200)}`,
              },
            });
            return;
          }

          // Calculate audio duration from generated WAV file
          let durationSec = 2.0;
          try {
            if (fs.existsSync(fullPath)) {
              const stats = fs.statSync(fullPath);
              const buffer = fs.readFileSync(fullPath);
              if (buffer.length >= 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
                const byteRate = buffer.readUInt32LE(28);
                const dataSize = stats.size - 44;
                if (byteRate > 0) {
                  durationSec = Number((dataSize / byteRate).toFixed(2));
                }
              }
            }
          } catch {}

          resolve({
            success: true,
            audioId,
            audioPath: fullPath,
            audioFileName: fileName,
            latencyMs,
            durationSec,
            charCount: boundedText.length,
          });
        }
      });

      // Stream text input via stdin to Piper
      piperProc.stdin.write(boundedText);
      piperProc.stdin.end();
    });
  }
}
