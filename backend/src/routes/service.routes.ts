import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { validateRequest } from '../middleware/validate';
import { createServiceSchema, updateServiceSchema } from '../validation/service.validation';

const router = Router();

router.post('/', validateRequest(createServiceSchema), ServiceController.create);
router.get('/', ServiceController.getAll);
router.get('/:id', ServiceController.getById);
router.put('/:id', validateRequest(updateServiceSchema), ServiceController.update);
router.delete('/:id', ServiceController.delete);

export default router;
