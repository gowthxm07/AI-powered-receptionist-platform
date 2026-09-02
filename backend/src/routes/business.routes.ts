import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { validateRequest } from '../middleware/validate';
import { createBusinessSchema, updateBusinessSchema } from '../validation/business.validation';

const router = Router();

router.post('/', validateRequest(createBusinessSchema), BusinessController.create);
router.get('/', BusinessController.getAll);
router.get('/:id', BusinessController.getById);
router.put('/:id', validateRequest(updateBusinessSchema), BusinessController.update);
router.delete('/:id', BusinessController.delete);

export default router;
