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

  listFiltered: async (params: {
    teamIds?: number[];
    assignedTo?: number;
    status?: Prisma.TaskWhereInput['status'];
    priority?: Prisma.TaskWhereInput['priority'];
    search?: string;
    page: number;
    pageSize: number;
  }) => {
    const where: Prisma.TaskWhereInput = {
      ...(params.teamIds ? { teamId: { in: params.teamIds } } : {}),
      ...(params.assignedTo ? { assignedTo: params.assignedTo } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: defaultTaskInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total };
  },

  getHistoryByTask: (taskId: number) =>
    prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { changedAt: 'desc' },
    }),
};
