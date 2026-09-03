import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/environment';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Validate incoming CORS origins supporting localhost, custom CORS_ORIGIN, and LAN IP addresses in development.
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // allow non-browser clients (curl, mobile native, server-to-server)
  if (config.corsOrigins.includes(origin)) return true;

  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    // Allow localhost, 127.0.0.1, and any local network IPv4 address on any port in development
    const devLanPattern = /^https?:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/;
    if (devLanPattern.test(origin)) {
      return true;
    }
  }

  return false;
};

export const createApp = (): Express => {
  const app = express();

  // CORS Configuration with Mobile LAN Support
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
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
