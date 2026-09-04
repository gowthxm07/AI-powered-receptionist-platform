import { Router } from 'express';
import { VoiceAnalyticsController } from '../controllers/voice-analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All voice analytics operations require authentication
router.use(authenticate);

// 1. Aggregate Analytics Summary (GET /api/analytics/voice?businessId=...)
router.get('/voice', VoiceAnalyticsController.getAggregateAnalytics);

// 2. Live Active Sessions (GET /api/analytics/voice/active?businessId=...)
router.get('/voice/active', VoiceAnalyticsController.getActiveSessions);

// 3. Historical Session Logs (GET /api/analytics/voice/sessions?businessId=...)
router.get('/voice/sessions', VoiceAnalyticsController.getSessionHistory);

// 4. Single Session Details (GET /api/analytics/voice/sessions/:id?businessId=...)
router.get('/voice/sessions/:id', VoiceAnalyticsController.getSessionById);

export default router;
