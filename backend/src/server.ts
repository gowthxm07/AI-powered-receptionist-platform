import { createApp } from './app';
import { config } from './config/environment';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 Smart Receptionist API Service Started`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health: http://localhost:${config.port}/api/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`=========================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
