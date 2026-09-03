import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface SpeechConfig {
  stt: {
    enabled: boolean;
    provider: 'whisper.cpp' | 'mock';
    modelName: string;
    modelPath: string;
    binaryPath: string;
    threads: number;
    timeoutMs: number;
    maxAudioSizeBytes: number; // e.g. 15MB
  };
  tts: {
    enabled: boolean;
    provider: 'piper' | 'mock';
    modelName: string;
    modelPath: string;
    configPath: string;
    binaryPath: string;
    timeoutMs: number;
    maxTextLength: number; // e.g. 500 characters
  };
  storage: {
    outputDir: string;
    uploadDir: string;
    ttlMs: number; // temporary audio retention (e.g. 1 hour)
  };
  paths: {
    baseDir: string;
    modelsDir: string;
    toolsDir: string;
    benchmarkOutputDir: string;
    runtimeDir: string;
  };
}

const baseDir = path.resolve(__dirname, '../../..');
const runtimeDir = path.resolve(baseDir, 'runtime');
const outputDir = process.env.AUDIO_OUTPUT_DIR
  ? path.resolve(baseDir, process.env.AUDIO_OUTPUT_DIR)
  : path.resolve(runtimeDir, 'audio');
const uploadDir = process.env.AUDIO_UPLOAD_DIR
  ? path.resolve(baseDir, process.env.AUDIO_UPLOAD_DIR)
  : path.resolve(runtimeDir, 'uploads');

export const speechConfig: SpeechConfig = {
  stt: {
    enabled: process.env.STT_ENABLED === 'true' || process.env.STT_ENABLED === undefined,
    provider: (process.env.STT_PROVIDER as any) || 'whisper.cpp',
    modelName: process.env.STT_MODEL_NAME || 'tiny.en',
    modelPath: process.env.WHISPER_MODEL_PATH
      ? path.resolve(baseDir, process.env.WHISPER_MODEL_PATH)
      : process.env.STT_MODEL_PATH
      ? path.resolve(baseDir, process.env.STT_MODEL_PATH)
      : path.resolve(baseDir, 'local-models/whisper/ggml-tiny.en.bin'),
    binaryPath: process.env.WHISPER_CPP_PATH
      ? path.resolve(baseDir, process.env.WHISPER_CPP_PATH)
      : process.env.STT_BINARY_PATH
      ? path.resolve(baseDir, process.env.STT_BINARY_PATH)
      : path.resolve(baseDir, 'local-tools/whisper/Release/whisper-cli.exe'),
    threads: Number(process.env.STT_THREADS) || 4,
    timeoutMs: Number(process.env.STT_TIMEOUT_MS) || 15000,
    maxAudioSizeBytes: 15 * 1024 * 1024, // 15 MB limit
  },
  tts: {
    enabled: process.env.TTS_ENABLED === 'true' || process.env.TTS_ENABLED === undefined,
    provider: (process.env.TTS_PROVIDER as any) || 'piper',
    modelName: process.env.TTS_MODEL_NAME || 'en_US-lessac-medium',
    modelPath: process.env.PIPER_MODEL_PATH
      ? path.resolve(baseDir, process.env.PIPER_MODEL_PATH)
      : process.env.TTS_MODEL_PATH
      ? path.resolve(baseDir, process.env.TTS_MODEL_PATH)
      : path.resolve(baseDir, 'local-models/piper/en_US-lessac-medium.onnx'),
    configPath: process.env.PIPER_CONFIG_PATH
      ? path.resolve(baseDir, process.env.PIPER_CONFIG_PATH)
      : path.resolve(baseDir, 'local-models/piper/en_US-lessac-medium.onnx.json'),
    binaryPath: process.env.PIPER_PATH
      ? path.resolve(baseDir, process.env.PIPER_PATH)
      : process.env.TTS_BINARY_PATH
      ? path.resolve(baseDir, process.env.TTS_BINARY_PATH)
      : path.resolve(baseDir, 'local-tools/piper/piper.exe'),
    timeoutMs: Number(process.env.TTS_TIMEOUT_MS) || 15000,
    maxTextLength: 600, // Safe maximum for conversational voice turn
  },
  storage: {
    outputDir,
    uploadDir,
    ttlMs: Number(process.env.AUDIO_TTL_MS) || 60 * 60 * 1000, // 1 hour
  },
  paths: {
    baseDir,
    modelsDir: path.resolve(baseDir, 'local-models'),
    toolsDir: path.resolve(baseDir, 'local-tools'),
    benchmarkOutputDir: path.resolve(baseDir, 'benchmark-output'),
    runtimeDir,
  },
};
