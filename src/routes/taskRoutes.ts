import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateStatus,
  updateTask,
} from '../controllers/taskController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import { idParamSchema } from '../validations/commonSchemas';
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from '../validations/taskSchemas';

const router = Router();

router.use(authenticate);

router.get('/', listTasks);
router.post('/', validateBody(createTaskSchema), createTask);
router.get('/:id', validateParams(idParamSchema), getTask);
router.put('/:id', validateParams(idParamSchema), validateBody(updateTaskSchema), updateTask);
router.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validateBody(updateTaskStatusSchema),
  updateStatus,
);
router.delete('/:id', validateParams(idParamSchema), requireRole([UserRole.admin]), deleteTask);

export default router;
