import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl: string;
}

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/receptionist_db?schema=public',
};
