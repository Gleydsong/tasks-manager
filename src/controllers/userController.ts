import { asyncHandler } from '../utils/asyncHandler';
import { userService } from '../services/userService';

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await userService.listUsers();
  return res.json({ users });
});
