import { SpeechToTextProvider, SpeechToTextResult, SpeechToTextOptions } from '../types/speech.types';

export class MockSTTProvider implements SpeechToTextProvider {
  public readonly name = 'mock-stt';

  private predefinedTranscript: string;
  private simulatedLatencyMs: number;
  private shouldFail: boolean;

  constructor(options?: { transcript?: string; simulatedLatencyMs?: number; shouldFail?: boolean }) {
    this.predefinedTranscript = options?.transcript || 'I want to book an appointment.';
    this.simulatedLatencyMs = options?.simulatedLatencyMs ?? 20;
    this.shouldFail = options?.shouldFail ?? false;
  }

  public setTranscript(transcript: string): void {
    this.predefinedTranscript = transcript;
  }

  public setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  public async transcribe(audioFilePath: string, _options?: SpeechToTextOptions): Promise<SpeechToTextResult> {
    const startTime = performance.now();

    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }

    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    if (this.shouldFail) {
      return {
        success: false,
        transcript: '',
        latencyMs,
        error: {
          code: 'STT_PROCESSING_FAILED',
          message: 'Simulated STT processing error for testing.',
        },
      };
    }

    return {
      success: true,
      transcript: this.predefinedTranscript,
      latencyMs,
      audioDurationSec: 2.5,
    };
  }
}
