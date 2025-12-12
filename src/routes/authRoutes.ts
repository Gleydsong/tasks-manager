import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { validateBody } from '../middlewares/validateRequest';
import { loginSchema, registerSchema } from '../validations/authSchemas';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
