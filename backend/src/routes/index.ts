import { Router } from 'express';
import healthRoutes from './health.routes';
import businessRoutes from './business.routes';
import customerRoutes from './customer.routes';

const router = Router();

// Mount Core API routes
router.use('/health', healthRoutes);
router.use('/businesses', businessRoutes);
router.use('/customers', customerRoutes);

export default router;
