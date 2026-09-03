import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface SpeechConfig {
  stt: {
    enabled: boolean;
    provider: 'whisper.cpp' | 'faster-whisper' | 'windows-sapi';
    modelName: string;
    modelPath: string;
    binaryPath: string;
    threads: number;
  };
  tts: {
    enabled: boolean;
    provider: 'piper' | 'windows-sapi' | 'espeak';
    modelName: string;
    modelPath: string;
    binaryPath: string;
  };
  paths: {
    baseDir: string;
    modelsDir: string;
    toolsDir: string;
    benchmarkOutputDir: string;
  };
}

const baseDir = path.resolve(__dirname, '../../..');

export const speechConfig: SpeechConfig = {
  stt: {
    enabled: process.env.STT_ENABLED === 'true',
    provider: (process.env.STT_PROVIDER as any) || 'whisper.cpp',
    modelName: process.env.STT_MODEL_NAME || 'tiny.en',
    modelPath: process.env.STT_MODEL_PATH
      ? path.resolve(baseDir, process.env.STT_MODEL_PATH)
      : path.resolve(baseDir, 'local-models/whisper/ggml-tiny.en.bin'),
    binaryPath: process.env.STT_BINARY_PATH
      ? path.resolve(baseDir, process.env.STT_BINARY_PATH)
      : path.resolve(baseDir, 'local-tools/whisper/Release/whisper-cli.exe'),
    threads: Number(process.env.STT_THREADS) || 4,
  },
  tts: {
    enabled: process.env.TTS_ENABLED === 'true',
    provider: (process.env.TTS_PROVIDER as any) || 'piper',
    modelName: process.env.TTS_MODEL_NAME || 'en_US-lessac-medium',
    modelPath: process.env.TTS_MODEL_PATH
      ? path.resolve(baseDir, process.env.TTS_MODEL_PATH)
      : path.resolve(baseDir, 'local-models/piper/en_US-lessac-medium.onnx'),
    binaryPath: process.env.TTS_BINARY_PATH
      ? path.resolve(baseDir, process.env.TTS_BINARY_PATH)
      : path.resolve(baseDir, 'local-tools/piper/piper.exe'),
  },
  paths: {
    baseDir,
    modelsDir: path.resolve(baseDir, 'local-models'),
    toolsDir: path.resolve(baseDir, 'local-tools'),
    benchmarkOutputDir: path.resolve(baseDir, 'benchmark-output'),
  },
};
