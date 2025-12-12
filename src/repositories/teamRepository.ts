import { Prisma, Team } from '@prisma/client';
import { prisma } from '../config/prisma';

export const teamRepository = {
  create: (data: Prisma.TeamCreateInput): Promise<Team> =>
    prisma.team.create({
      data,
    }),

  findById: (id: number) =>
    prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
      },
    }),

  listAll: () =>
    prisma.team.findMany({
      include: {
        members: { include: { user: true } },
      },
      orderBy: { id: 'asc' },
    }),

  listByUser: (userId: number) =>
    prisma.team.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: { include: { user: true } },
      },
    }),

  update: (id: number, data: Prisma.TeamUpdateInput) =>
    prisma.team.update({
      where: { id },
      data,
    }),

  delete: (id: number) =>
    prisma.team.delete({
      where: { id },
    }),
};
