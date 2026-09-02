import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/environment';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  // CORS Configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie'],
    })
  );

  // Body and Cookie Parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Root welcome endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'AI-Powered Smart Receptionist Platform - API Service',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
      },
    });
  });

  // API Routes
  app.use('/api', apiRoutes);

  // 404 & Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
