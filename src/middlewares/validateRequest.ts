import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/errors';

type RequestPart = 'body' | 'params' | 'query';

const validate =
  (schema: z.ZodType, part: RequestPart = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const data = (req as Record<RequestPart, unknown>)[part];
    const result = schema.safeParse(data);

    if (!result.success) {
      return next(
        new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', result.error.flatten()),
      );
    }

    (req as Record<RequestPart, unknown>)[part] = result.data as unknown;
    return next();
  };

export const validateBody = (schema: z.ZodType) => validate(schema, 'body');
export const validateParams = (schema: z.ZodType) => validate(schema, 'params');
export const validateQuery = (schema: z.ZodType) => validate(schema, 'query');
