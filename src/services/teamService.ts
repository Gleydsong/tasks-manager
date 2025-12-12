import { Team, UserRole } from '@prisma/client';
import { teamRepository } from '../repositories/teamRepository';
import { userRepository } from '../repositories/userRepository';
import { teamMemberRepository } from '../repositories/teamMemberRepository';
import { ApiError } from '../utils/errors';

const ensureTeamExists = async (teamId: number): Promise<Team> => {
  const team = await teamRepository.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'NOT_FOUND', 'Team not found.');
  }

  return team;
};

export const teamService = {
  createTeam: async (name: string, description?: string | null) => {
    return teamRepository.create({ name, description: description ?? null });
  },

  listTeamsForUser: async (userId: number, role: UserRole) => {
    if (role === UserRole.admin) {
      return teamRepository.listAll();
    }

    return teamRepository.listByUser(userId);
  },

  addMember: async (teamId: number, userId: number) => {
    await ensureTeamExists(teamId);
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    const alreadyMember = await teamMemberRepository.isMember(teamId, userId);
    if (alreadyMember) {
      throw new ApiError(409, 'CONFLICT', 'User is already a member of this team.');
    }

    return teamMemberRepository.addMember(teamId, userId);
  },

  getTeamWithMembers: async (teamId: number, requesterId: number, role: UserRole) => {
    const team = await ensureTeamExists(teamId);

    if (role !== UserRole.admin) {
      const isMember = await teamMemberRepository.isMember(teamId, requesterId);
      if (!isMember) {
        throw new ApiError(403, 'FORBIDDEN', 'You are not allowed to view this team.');
      }
    }

    return team;
  },

  updateTeam: async (teamId: number, data: { name?: string; description?: string | null }) => {
    await ensureTeamExists(teamId);
    return teamRepository.update(teamId, data);
  },

  deleteTeam: async (teamId: number) => {
    await ensureTeamExists(teamId);
    return teamRepository.delete(teamId);
  },

  removeMember: async (teamId: number, userId: number) => {
    await ensureTeamExists(teamId);
    const membership = await teamMemberRepository.isMember(teamId, userId);
    if (!membership) {
      throw new ApiError(404, 'NOT_FOUND', 'Member not found in this team.');
    }
    await teamMemberRepository.removeMember(teamId, userId);
    return membership;
  },
};
