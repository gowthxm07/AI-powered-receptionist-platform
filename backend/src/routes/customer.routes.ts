import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createCustomerSchema, updateCustomerSchema } from '../validation/customer.validation';

const router = Router();

// All customer operations require valid user authentication
router.use(authenticate);

router.post('/', validateRequest(createCustomerSchema), CustomerController.create);
router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.put('/:id', validateRequest(updateCustomerSchema), CustomerController.update);
router.delete('/:id', CustomerController.delete);

export default router;
