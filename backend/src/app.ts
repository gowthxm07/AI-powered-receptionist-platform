import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

export const createApp = (): Express => {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());

  return app;
};
