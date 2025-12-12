import { Prisma, Task } from '@prisma/client';
import { prisma } from '../config/prisma';

const defaultTaskInclude = {
  assignee: true,
  team: true,
  history: true,
};

export const taskRepository = {
  create: (data: Prisma.TaskCreateInput): Promise<Task> =>
    prisma.task.create({
      data,
      include: defaultTaskInclude,
    }),

  findById: (id: number) =>
    prisma.task.findUnique({
      where: { id },
      include: defaultTaskInclude,
    }),

  listAll: () =>
    prisma.task.findMany({
      include: defaultTaskInclude,
      orderBy: { id: 'asc' },
    }),

  listByTeamIds: (teamIds: number[]) =>
    prisma.task.findMany({
      where: {
        teamId: { in: teamIds },
      },
      include: defaultTaskInclude,
      orderBy: { id: 'asc' },
    }),

  update: (id: number, data: Prisma.TaskUpdateInput) =>
    prisma.task.update({
      where: { id },
      data,
      include: defaultTaskInclude,
    }),

  delete: (id: number) =>
    prisma.task.delete({
      where: { id },
    }),
};
