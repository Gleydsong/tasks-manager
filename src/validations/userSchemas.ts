import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
});
