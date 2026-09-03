import crypto from 'crypto';
import { TextToSpeechProvider, TextToSpeechResult, TextToSpeechOptions } from '../types/speech.types';

export class MockTTSProvider implements TextToSpeechProvider {
  public readonly name = 'mock-tts';

  private simulatedLatencyMs: number;
  private shouldFail: boolean;

  constructor(options?: { simulatedLatencyMs?: number; shouldFail?: boolean }) {
    this.simulatedLatencyMs = options?.simulatedLatencyMs ?? 20;
    this.shouldFail = options?.shouldFail ?? false;
  }

  public setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  public async synthesize(text: string, options?: TextToSpeechOptions): Promise<TextToSpeechResult> {
    const startTime = performance.now();

    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }

    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    if (!text || text.trim().length === 0) {
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

    if (this.shouldFail) {
      return {
        success: false,
        audioId: '',
        audioPath: '',
        audioFileName: '',
        latencyMs,
        charCount: text.length,
        error: {
          code: 'TTS_SYNTHESIS_FAILED',
          message: 'Simulated TTS synthesis error for testing.',
        },
      };
    }

    const audioId = crypto.randomBytes(16).toString('hex');
    const audioFileName = options?.outputFileName || `mock_${audioId}.wav`;

    return {
      success: true,
      audioId,
      audioPath: `/runtime/audio/${audioFileName}`,
      audioFileName,
      latencyMs,
      durationSec: Number(((text.length * 0.05) + 0.5).toFixed(2)),
      charCount: text.length,
    };
  }
}
