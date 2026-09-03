import { Router } from 'express';
import { AIConversationController } from '../controllers/ai-conversation.controller';
import aiVoiceRoutes from './ai-voice.routes';
import { validateRequest } from '../middleware/validate';
import { aiConversationRequestSchema } from '../validation/ai-conversation.validation';

const router = Router();

// Primary conversation interaction endpoint (Text / Web)
router.post(
  '/conversation',
  validateRequest(aiConversationRequestSchema),
  AIConversationController.processConversation
);

// Voice conversation pipeline & audio streaming endpoints
router.use('/voice', aiVoiceRoutes);

export default router;
