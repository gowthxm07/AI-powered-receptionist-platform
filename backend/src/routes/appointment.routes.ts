import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { validateRequest, validateQuery } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentQuerySchema,
  availabilityCheckSchema,
} from '../validation/appointment.validation';

const router = Router();

// All appointment operations require user authentication
router.use(authenticate);

// Lightweight availability check for staff scheduling
router.get('/availability', validateQuery(availabilityCheckSchema), AppointmentController.checkAvailability);

// CRUD operations
router.post('/', validateRequest(createAppointmentSchema), AppointmentController.create);
router.get('/', validateQuery(appointmentQuerySchema), AppointmentController.getAll);
router.get('/:id', AppointmentController.getById);
router.put('/:id', validateRequest(updateAppointmentSchema), AppointmentController.update);
router.patch('/:id/cancel', AppointmentController.cancel);

export default router;
