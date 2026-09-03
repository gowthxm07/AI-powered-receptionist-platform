import { Router } from 'express';
import { AIConversationController } from '../controllers/ai-conversation.controller';
import { validateRequest } from '../middleware/validate';
import { aiConversationRequestSchema } from '../validation/ai-conversation.validation';

const router = Router();

// Primary conversation interaction endpoint
router.post(
  '/conversation',
  validateRequest(aiConversationRequestSchema),
  AIConversationController.processConversation
);

export default router;
