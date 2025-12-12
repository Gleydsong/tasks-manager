import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodTypeAny } from 'zod';
import { ApiError } from '../utils/errors';

type RequestPart = 'body' | 'params' | 'query';

const validate =
  (schema: ZodSchema<ZodTypeAny>, part: RequestPart = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const data = (req as Record<RequestPart, unknown>)[part];
    const result = schema.safeParse(data);

    if (!result.success) {
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', result.error.flatten()));
    }

    (req as Record<RequestPart, unknown>)[part] = result.data as unknown;
    return next();
  };

export const validateBody = (schema: ZodSchema<ZodTypeAny>) => validate(schema, 'body');
export const validateParams = (schema: ZodSchema<ZodTypeAny>) => validate(schema, 'params');
export const validateQuery = (schema: ZodSchema<ZodTypeAny>) => validate(schema, 'query');
