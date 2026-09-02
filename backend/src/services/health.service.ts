import { config } from '../config/environment';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  version: string;
}

export class HealthService {
  public static getSystemHealth(): HealthCheckResult {
    return {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: '1.0.0',
    };
  }
}
