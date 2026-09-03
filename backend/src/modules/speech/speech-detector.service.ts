import fs from 'fs';
import { speechConfig } from './speech.config';

export interface SpeechRuntimeStatus {
  stt: {
    available: boolean;
    provider: string;
    modelFound: boolean;
    binaryFound: boolean;
    modelPath: string;
    binaryPath: string;
  };
  tts: {
    available: boolean;
    provider: string;
    modelFound: boolean;
    binaryFound: boolean;
    modelPath: string;
    binaryPath: string;
  };
}

export class SpeechDetectorService {
  /**
   * Check whether local speech binaries and model weights are installed on disk.
   */
  public static checkAvailability(): SpeechRuntimeStatus {
    const sttBinaryFound = fs.existsSync(speechConfig.stt.binaryPath);
    const sttModelFound = fs.existsSync(speechConfig.stt.modelPath);
    const sttAvailable = sttBinaryFound && sttModelFound;

    const ttsBinaryFound = fs.existsSync(speechConfig.tts.binaryPath);
    const ttsModelFound = fs.existsSync(speechConfig.tts.modelPath);
    const ttsAvailable = ttsBinaryFound && ttsModelFound;

    return {
      stt: {
        available: sttAvailable,
        provider: speechConfig.stt.provider,
        modelFound: sttModelFound,
        binaryFound: sttBinaryFound,
        modelPath: speechConfig.stt.modelPath,
        binaryPath: speechConfig.stt.binaryPath,
      },
      tts: {
        available: ttsAvailable,
        provider: speechConfig.tts.provider,
        modelFound: ttsModelFound,
        binaryFound: ttsBinaryFound,
        modelPath: speechConfig.tts.modelPath,
        binaryPath: speechConfig.tts.binaryPath,
      },
    };
  }
}
