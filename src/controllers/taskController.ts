import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { taskService } from '../services/taskService';
import { asyncHandler } from '../utils/asyncHandler';

export const createTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const task = await taskService.createTask(req.body, req.user!);
  return res.status(201).json({ task });
});

export const listTasks = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tasks = await taskService.listTasks(req.user!);
  return res.json({ tasks });
});

export const getTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const task = await taskService.getTask(taskId, req.user!);
  return res.json({ task });
});

export const updateTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const task = await taskService.updateTask(taskId, req.body, req.user!);
  return res.json({ task });
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;
  const task = await taskService.updateStatus(taskId, status, req.user!);
  return res.json({ task });
});

export const deleteTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  await taskService.deleteTask(taskId, req.user!);
  return res.status(204).send();
});
