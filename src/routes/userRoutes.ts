import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { deleteUser, getUser, listUsers, updateUser } from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import { idParamSchema } from '../validations/commonSchemas';
import { updateUserSchema } from '../validations/userSchemas';

const router = Router();

router.use(authenticate, requireRole([UserRole.admin]));
router.get('/', listUsers);
router.get('/:id', validateParams(idParamSchema), getUser);
router.patch('/:id', validateParams(idParamSchema), validateBody(updateUserSchema), updateUser);
router.delete('/:id', validateParams(idParamSchema), deleteUser);

export default router;
