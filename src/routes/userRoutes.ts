import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { listUsers } from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticate, requireRole([UserRole.admin]));
router.get('/', listUsers);

export default router;
