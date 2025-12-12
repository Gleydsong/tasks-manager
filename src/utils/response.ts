import { Response } from 'express';

export const sendSuccess = <T>(res: Response, data: T, meta?: Record<string, unknown>) => {
  return res.json({ data, ...(meta ? { meta } : {}) });
};
