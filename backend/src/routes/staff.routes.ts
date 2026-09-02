import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { validateRequest } from '../middleware/validate';
import { createStaffSchema, updateStaffSchema } from '../validation/staff.validation';

const router = Router();

router.post('/', validateRequest(createStaffSchema), StaffController.create);
router.get('/', StaffController.getAll);
router.get('/:id', StaffController.getById);
router.put('/:id', validateRequest(updateStaffSchema), StaffController.update);
router.delete('/:id', StaffController.delete);

export default router;
