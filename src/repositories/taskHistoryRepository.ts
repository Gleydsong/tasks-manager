import { TaskHistory, TaskStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export const taskHistoryRepository = {
  create: (
    taskId: number,
    changedBy: number,
    oldStatus: TaskStatus,
    newStatus: TaskStatus,
  ): Promise<TaskHistory> =>
    prisma.taskHistory.create({
      data: {
        taskId,
        changedBy,
        oldStatus,
        newStatus,
      },
    }),
};
