import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createServiceSchema, updateServiceSchema } from '../validation/service.validation';

const router = Router();

// All service operations require valid user authentication
router.use(authenticate);

router.post('/', validateRequest(createServiceSchema), ServiceController.create);
router.get('/', ServiceController.getAll);
router.get('/:id', ServiceController.getById);
router.put('/:id', validateRequest(updateServiceSchema), ServiceController.update);
router.delete('/:id', ServiceController.delete);

export default router;
