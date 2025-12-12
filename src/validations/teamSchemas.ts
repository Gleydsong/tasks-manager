import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const addTeamMemberSchema = z.object({
  userId: z.coerce.number().int().positive(),
});
