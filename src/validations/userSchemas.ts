import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    role: z.nativeEnum(UserRole).optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'At least one field must be provided.',
  });
