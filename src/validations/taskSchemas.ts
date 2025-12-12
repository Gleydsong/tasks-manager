import { z } from 'zod';
import { parsePriorityInput, parseStatusInput } from '../utils/taskMapper';

const statusSchema = z
  .string()
  .min(1)
  .transform((val, ctx) => {
    const parsed = parseStatusInput(val);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'Invalid status' });
      return z.NEVER;
    }
    return val;
  });

const prioritySchema = z
  .string()
  .min(1)
  .transform((val, ctx) => {
    const parsed = parsePriorityInput(val);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'Invalid priority' });
      return z.NEVER;
    }
    return val;
  });

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedTo: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().positive(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    assignedTo: z.coerce.number().int().positive().optional(),
    teamId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

export const updateTaskStatusSchema = z.object({
  status: statusSchema,
});

export const taskQuerySchema = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  assignedTo: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});
