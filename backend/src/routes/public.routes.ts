import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';

const router = Router();

// Publicly discoverable businesses for customer-facing Voice Reception (no authentication required)
router.get('/businesses', BusinessController.getPublic);

export default router;
