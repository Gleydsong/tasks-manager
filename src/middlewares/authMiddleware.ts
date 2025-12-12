import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: UserRole;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication token is missing.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      return next(new ApiError(401, 'User no longer exists.'));
    }

    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token.'));
  }
};
