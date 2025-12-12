import { Prisma, User } from '@prisma/client';
import { prisma } from '../config/prisma';

export const userRepository = {
  create: (data: Prisma.UserCreateInput): Promise<User> => prisma.user.create({ data }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
    }),

  findById: (id: number) =>
    prisma.user.findUnique({
      where: { id },
    }),

  listAll: () =>
    prisma.user.findMany({
      include: {
        teamMemberships: {
          include: { team: true },
        },
      },
      orderBy: { id: 'asc' },
    }),

  update: (id: number, data: Prisma.UserUpdateInput) =>
    prisma.user.update({
      where: { id },
      data,
    }),

  delete: (id: number) =>
    prisma.user.delete({
      where: { id },
    }),
};
