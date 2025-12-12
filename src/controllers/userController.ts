import { asyncHandler } from '../utils/asyncHandler';
import { userService } from '../services/userService';
import { sendSuccess } from '../utils/response';

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await userService.listUsers();
  return sendSuccess(res, users);
});

export const getUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = await userService.getById(id);
  return sendSuccess(res, user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = await userService.updateUser(id, req.body);
  return sendSuccess(res, user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await userService.deleteUser(id);
  return res.status(204).send();
});
