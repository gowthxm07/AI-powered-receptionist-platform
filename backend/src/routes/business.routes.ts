import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createBusinessSchema, updateBusinessSchema } from '../validation/business.validation';

const router = Router();

// Public business discovery route for customer voice reception (unauthenticated)
router.get('/public', BusinessController.getPublic);

// All subsequent business routes require valid user authentication
router.use(authenticate);

router.post('/', validateRequest(createBusinessSchema), BusinessController.create);
router.get('/', BusinessController.getAll);
router.get('/:id', BusinessController.getById);
router.put('/:id', validateRequest(updateBusinessSchema), BusinessController.update);
router.delete('/:id', BusinessController.delete);

export default router;
