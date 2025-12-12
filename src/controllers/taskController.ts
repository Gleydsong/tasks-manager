import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { taskService } from '../services/taskService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { historyToApi, taskToApi } from '../utils/taskMapper';

export const createTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const task = await taskService.createTask(req.body, req.user!);
  return res.status(201).json({ data: taskToApi(task) });
});

export const listTasks = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = req.query as any;
  const { tasks, total } = await taskService.listTasks(req.user!, query);
  return sendSuccess(res, tasks.map(taskToApi), {
    total,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
  });
});

export const getTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const task = await taskService.getTask(taskId, req.user!);
  return sendSuccess(res, taskToApi(task));
});

export const updateTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const task = await taskService.updateTask(taskId, req.body, req.user!);
  return sendSuccess(res, taskToApi(task));
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;
  const task = await taskService.updateStatus(taskId, status, req.user!);
  return sendSuccess(res, taskToApi(task));
});

export const deleteTask = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  await taskService.deleteTask(taskId, req.user!);
  return res.status(204).send();
});

export const getHistory = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  const history = await taskService.getHistory(taskId, req.user!);
  return sendSuccess(res, history.map(historyToApi));
});
