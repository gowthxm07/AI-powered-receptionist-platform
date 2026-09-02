import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export const getHealthCheck = (req: Request, res: Response): void => {
  try {
    const healthData = HealthService.getSystemHealth();

    res.status(200).json({
      success: true,
      message: 'AI-Powered Receptionist API is running',
      data: healthData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
