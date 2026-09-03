import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import customerRoutes from './customer.routes';
import staffRoutes from './staff.routes';
import serviceRoutes from './service.routes';
import appointmentRoutes from './appointment.routes';
import aiRoutes from './ai.routes';

const router = Router();

// Mount Core API routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/businesses', businessRoutes);
router.use('/customers', customerRoutes);
router.use('/staff', staffRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/ai', aiRoutes);

export default router;
