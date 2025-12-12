import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError, isApiError } from '../utils/errors';

const formatError = (res: Response, status: number, code: string, message: string, details?: unknown) =>
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    return formatError(res, 422, 'VALIDATION_ERROR', 'Validation failed.', error.flatten());
  }

  if (isApiError(error)) {
    return formatError(res, error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return formatError(res, 409, 'CONFLICT', 'Resource already exists.', error.meta);
    }
  }

  console.error(error);
  return formatError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error.');
};
