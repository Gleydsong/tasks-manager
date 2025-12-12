import { TeamMember } from '@prisma/client';
import { prisma } from '../config/prisma';

export const teamMemberRepository = {
  addMember: (teamId: number, userId: number): Promise<TeamMember> =>
    prisma.teamMember.create({
      data: { teamId, userId },
    }),

  isMember: (teamId: number, userId: number) =>
    prisma.teamMember.findFirst({
      where: { teamId, userId },
    }),

  listByTeam: (teamId: number) =>
    prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    }),

  getTeamIdsForUser: async (userId: number) => {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return memberships.map((membership) => membership.teamId);
  },

  removeMember: (teamId: number, userId: number) =>
    prisma.teamMember.deleteMany({
      where: { teamId, userId },
    }),
};
