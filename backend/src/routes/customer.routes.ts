import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validateRequest } from '../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from '../validation/customer.validation';

const router = Router();

router.post('/', validateRequest(createCustomerSchema), CustomerController.create);
router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getById);
router.put('/:id', validateRequest(updateCustomerSchema), CustomerController.update);
router.delete('/:id', CustomerController.delete);

export default router;
