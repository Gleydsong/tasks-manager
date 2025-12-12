import { User, UserRole } from '@prisma/client';
import { userRepository } from '../repositories/userRepository';
import { ApiError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

const sanitizeUser = (user: User) => {
  const { password, ...rest } = user;
  return rest;
};

export const authService = {
  register: async (name: string, email: string, password: string) => {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ApiError(409, 'USER_EXISTS', 'User already exists with this email.');
    }

    const hashedPassword = await hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.member,
    });

    const token = generateToken({ userId: user.id, role: user.role });

    return { user: sanitizeUser(user), token };
  },

  login: async (email: string, password: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
    }

    const token = generateToken({ userId: user.id, role: user.role });
    return { user: sanitizeUser(user), token };
  },
};
