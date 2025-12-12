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
      throw new ApiError(404, 'User not found.');
    }

    return sanitizeUser(user);
  },

  listUsers: async () => {
    const users = await userRepository.listAll();
    return users.map(sanitizeUser);
  },
};
