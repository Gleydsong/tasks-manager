import { TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const statusEnum = z.nativeEnum(TaskStatus);
const priorityEnum = z.nativeEnum(TaskPriority);

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assignedTo: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().positive(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assignedTo: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

export const updateTaskStatusSchema = z.object({
  status: statusEnum,
});
