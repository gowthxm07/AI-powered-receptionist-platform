import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  corsOrigins: string[];
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;
  ollamaKeepAlive: string;
}

const rawCors = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
const corsOrigins = rawCors.split(',').map((s) => s.trim()).filter(Boolean);

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: corsOrigins[0] || 'http://localhost:3000',
  corsOrigins,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5433/receptionist_db?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_fallback_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  ollamaTimeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10),
  ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE || '5m',
};
