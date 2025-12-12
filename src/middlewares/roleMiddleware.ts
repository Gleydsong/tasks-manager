import { NextFunction, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './authMiddleware';
import { ApiError } from '../utils/errors';

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'),
      );
    }

    return next();
  };
};
