import { asyncHandler } from '../utils/asyncHandler';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register(name, email, password);
  return res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return res.json(result);
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await userService.getProfile(req.user!.id);
  return res.json({ user });
});
