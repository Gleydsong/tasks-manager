import { Prisma, Task, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { taskRepository } from '../repositories/taskRepository';
import { teamRepository } from '../repositories/teamRepository';
import { teamMemberRepository } from '../repositories/teamMemberRepository';
import { taskHistoryRepository } from '../repositories/taskHistoryRepository';
import { userRepository } from '../repositories/userRepository';
import { parsePriorityInput, parseStatusInput } from '../utils/taskMapper';

type CurrentUser = { id: number; role: UserRole };

const ensureTeamExists = async (teamId: number) => {
  const team = await teamRepository.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'NOT_FOUND', 'Team not found.');
  }
  return team;
};

const ensureUserIsMember = async (teamId: number, user: CurrentUser) => {
  if (user.role === UserRole.admin) return;
  const member = await teamMemberRepository.isMember(teamId, user.id);
  if (!member) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not part of this team.');
  }
};

const ensureAssigneeBelongsToTeam = async (teamId: number, userId: number) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'Assignee user not found.');
  }

  const member = await teamMemberRepository.isMember(teamId, userId);
  if (!member) {
    throw new ApiError(400, 'INVALID_ASSIGNEE', 'Assignee must belong to the team.');
  }
};

const getTaskOrThrow = async (taskId: number) => {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }
  return task;
};

const ensureCanEditTask = async (task: Task, user: CurrentUser) => {
  if (user.role === UserRole.admin) return;
  await ensureUserIsMember(task.teamId, user);
  if (task.assignedTo !== user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'Members can only edit tasks assigned to them.');
  }
};

const buildTaskUpdate = (
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedTo?: number;
    teamId?: number;
  },
  isAdmin: boolean,
): Prisma.TaskUpdateInput => {
  const status = parseStatusInput(data.status);
  const priority = parsePriorityInput(data.priority);

  const update: Prisma.TaskUpdateInput = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (status) update.status = status;
  if (priority) update.priority = priority;

  if (isAdmin && typeof data.assignedTo === 'number') {
    update.assignee = { connect: { id: data.assignedTo } };
  }

  if (isAdmin && typeof data.teamId === 'number') {
    update.team = { connect: { id: data.teamId } };
  }

  return update;
};

export const taskService = {
  createTask: async (
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedTo: number;
      teamId: number;
    },
    user: CurrentUser,
  ) => {
    await ensureTeamExists(data.teamId);
    await ensureUserIsMember(data.teamId, user);

    const status = parseStatusInput(data.status) ?? TaskStatus.pending;
    const priority = parsePriorityInput(data.priority) ?? TaskPriority.medium;

    // Verificar se o assignee existe e pertence ao time antes de verificar permissões
    await ensureAssigneeBelongsToTeam(data.teamId, data.assignedTo);

    // members can only assign to themselves
    if (user.role === UserRole.member && data.assignedTo !== user.id) {
      throw new ApiError(403, 'FORBIDDEN', 'Members can only assign tasks to themselves.');
    }

    return taskRepository.create({
      title: data.title,
      description: data.description,
      status,
      priority,
      assignee: { connect: { id: data.assignedTo } },
      team: { connect: { id: data.teamId } },
    });
  },

  listTasks: async (
    user: CurrentUser,
    filters: {
      teamId?: number;
      assignedTo?: number;
      status?: string;
      priority?: string;
      search?: string;
      page: number;
      pageSize: number;
    },
  ) => {
    const status = parseStatusInput(filters.status);
    const priority = parsePriorityInput(filters.priority);

    if (filters.teamId && filters.teamId > 0) {
      await ensureTeamExists(filters.teamId);
    }

    let allowedTeamIds: number[] | undefined;

    if (user.role === UserRole.admin) {
      allowedTeamIds = filters.teamId ? [filters.teamId] : undefined;
    } else {
      const membershipTeamIds = await teamMemberRepository.getTeamIdsForUser(user.id);
      if (membershipTeamIds.length === 0) return { tasks: [], total: 0 };

      if (filters.teamId) {
        if (!membershipTeamIds.includes(filters.teamId)) {
          throw new ApiError(403, 'FORBIDDEN', 'You cannot access this team.');
        }
        allowedTeamIds = [filters.teamId];
      } else {
        allowedTeamIds = membershipTeamIds;
      }
    }

    const { tasks, total } = await taskRepository.listFiltered({
      teamIds: allowedTeamIds,
      assignedTo: filters.assignedTo,
      status,
      priority,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    return { tasks, total };
  },

  getTask: async (taskId: number, user: CurrentUser) => {
    const task = await getTaskOrThrow(taskId);
    if (user.role !== UserRole.admin) {
      await ensureUserIsMember(task.teamId, user);
    }
    return task;
  },

  updateTask: async (
    taskId: number,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignedTo?: number;
      teamId?: number;
    },
    user: CurrentUser,
  ) => {
    const task = await getTaskOrThrow(taskId);
    await ensureCanEditTask(task, user);

    if (user.role !== UserRole.admin) {
      if (data.assignedTo && data.assignedTo !== task.assignedTo) {
        throw new ApiError(403, 'FORBIDDEN', 'Members cannot reassign tasks.');
      }
      if (data.teamId && data.teamId !== task.teamId) {
        throw new ApiError(403, 'FORBIDDEN', 'Members cannot move tasks to another team.');
      }
    }

    const targetTeamId = data.teamId ?? task.teamId;
    const targetAssigneeId = data.assignedTo ?? task.assignedTo;

    if (targetTeamId !== task.teamId) {
      await ensureTeamExists(targetTeamId);
    }

    await ensureAssigneeBelongsToTeam(targetTeamId, targetAssigneeId);

    const status = parseStatusInput(data.status);
    const update = buildTaskUpdate(data, user.role === UserRole.admin);

    if (status && status !== task.status) {
      await taskHistoryRepository.create(taskId, user.id, task.status, status);
    }

    return taskRepository.update(taskId, update);
  },

  updateStatus: async (taskId: number, statusInput: string, user: CurrentUser) => {
    const status = parseStatusInput(statusInput);
    if (!status) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid status provided.');
    }

    const task = await getTaskOrThrow(taskId);
    await ensureCanEditTask(task, user);

    if (status === task.status) {
      return task;
    }

    await taskHistoryRepository.create(taskId, user.id, task.status, status);
    return taskRepository.update(taskId, { status });
  },

  deleteTask: async (taskId: number, user: CurrentUser) => {
    const task = await getTaskOrThrow(taskId);

    if (user.role === UserRole.member) {
      if (task.assignedTo !== user.id) {
        throw new ApiError(403, 'FORBIDDEN', 'Members can only delete their own tasks.');
      }
      await ensureUserIsMember(task.teamId, user);
    }

    return taskRepository.delete(taskId);
  },

  getHistory: async (taskId: number, user: CurrentUser) => {
    const task = await getTaskOrThrow(taskId);
    if (user.role !== UserRole.admin) {
      await ensureUserIsMember(task.teamId, user);
    }

    return taskRepository.getHistoryByTask(taskId);
  },
};
