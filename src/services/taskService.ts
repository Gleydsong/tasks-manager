import { Task, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { taskRepository } from '../repositories/taskRepository';
import { teamRepository } from '../repositories/teamRepository';
import { teamMemberRepository } from '../repositories/teamMemberRepository';
import { taskHistoryRepository } from '../repositories/taskHistoryRepository';
import { userRepository } from '../repositories/userRepository';

type CurrentUser = { id: number; role: UserRole };

const ensureTeamExists = async (teamId: number) => {
  const team = await teamRepository.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found.');
  }
  return team;
};

const ensureUserIsMember = async (teamId: number, user: CurrentUser) => {
  if (user.role === UserRole.admin) return;
  const member = await teamMemberRepository.isMember(teamId, user.id);
  if (!member) {
    throw new ApiError(403, 'You are not part of this team.');
  }
};

const ensureAssigneeBelongsToTeam = async (teamId: number, userId: number) => {
  const member = await teamMemberRepository.isMember(teamId, userId);
  if (!member) {
    throw new ApiError(400, 'Assignee must belong to the team.');
  }
};

const getTaskOrThrow = async (taskId: number) => {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }
  return task;
};

const ensureCanEditTask = async (task: Task, user: CurrentUser) => {
  if (user.role === UserRole.admin) return;
  await ensureUserIsMember(task.teamId, user);
  if (task.assignedTo !== user.id) {
    throw new ApiError(403, 'Members can only edit tasks assigned to them.');
  }
};

export const taskService = {
  createTask: async (
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedTo: number;
      teamId: number;
    },
    user: CurrentUser,
  ) => {
    await ensureTeamExists(data.teamId);
    await ensureUserIsMember(data.teamId, user);
    await ensureAssigneeBelongsToTeam(data.teamId, data.assignedTo);

    return taskRepository.create({
      title: data.title,
      description: data.description,
      status: data.status ?? TaskStatus.pending,
      priority: data.priority ?? TaskPriority.medium,
      assignee: { connect: { id: data.assignedTo } },
      team: { connect: { id: data.teamId } },
    });
  },

  listTasks: async (user: CurrentUser) => {
    if (user.role === UserRole.admin) {
      return taskRepository.listAll();
    }

    const teamIds = await teamMemberRepository.getTeamIdsForUser(user.id);
    if (teamIds.length === 0) {
      return [];
    }

    return taskRepository.listByTeamIds(teamIds);
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
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assignedTo'>>,
    user: CurrentUser,
  ) => {
    const task = await getTaskOrThrow(taskId);
    await ensureCanEditTask(task, user);

    if (typeof data.assignedTo === 'number') {
      await ensureAssigneeBelongsToTeam(task.teamId, data.assignedTo);
    }

    if (data.status && data.status !== task.status) {
      await taskHistoryRepository.create(taskId, user.id, task.status, data.status);
    }

    return taskRepository.update(taskId, data);
  },

  updateStatus: async (taskId: number, status: TaskStatus, user: CurrentUser) => {
    const task = await getTaskOrThrow(taskId);
    await ensureCanEditTask(task, user);

    if (status === task.status) {
      return task;
    }

    await taskHistoryRepository.create(taskId, user.id, task.status, status);
    return taskRepository.update(taskId, { status });
  },

  deleteTask: async (taskId: number, user: CurrentUser) => {
    if (user.role !== UserRole.admin) {
      throw new ApiError(403, 'Only admins can delete tasks.');
    }

    await getTaskOrThrow(taskId);
    return taskRepository.delete(taskId);
  },
};
