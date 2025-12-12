import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError, isApiError } from '../utils/errors';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: error.flatten(),
    });
  }

  if (isApiError(error)) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error.' });
};
