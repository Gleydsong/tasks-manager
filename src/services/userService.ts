import { User } from '@prisma/client';
import { userRepository } from '../repositories/userRepository';
import { ApiError } from '../utils/errors';

const sanitizeUser = (user: User) => {
  const { password, ...rest } = user;
  return rest;
};

export const userService = {
  getProfile: async (id: number) => {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    return sanitizeUser(user);
  },

  listUsers: async () => {
    const users = await userRepository.listAll();
    return users.map(sanitizeUser);
  },

  getById: async (id: number) => {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }
    return sanitizeUser(user);
  },

  updateUser: async (id: number, data: Partial<Pick<User, 'name' | 'role'>>) => {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    const updated = await userRepository.update(id, data);
    return sanitizeUser(updated);
  },

  deleteUser: async (id: number) => {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    await userRepository.delete(id);
  },
};
