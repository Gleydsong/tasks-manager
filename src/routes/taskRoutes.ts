import { Router } from 'express';
import { 
  createTask,
  deleteTask,
  getTask,
  getHistory,
  listTasks,
  updateStatus,
  updateTask,
} from '../controllers/taskController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateRequest';
import { idParamSchema } from '../validations/commonSchemas';
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validations/taskSchemas';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(taskQuerySchema), listTasks);
router.post('/', validateBody(createTaskSchema), createTask);
router.get('/:id', validateParams(idParamSchema), getTask);
router.put('/:id', validateParams(idParamSchema), validateBody(updateTaskSchema), updateTask);
router.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validateBody(updateTaskStatusSchema),
  updateStatus,
);
router.get('/:id/history', validateParams(idParamSchema), getHistory);
router.delete('/:id', validateParams(idParamSchema), deleteTask);

export default router;
