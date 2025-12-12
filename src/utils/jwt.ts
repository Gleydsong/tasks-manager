import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import config from '../config/env';

export interface TokenPayload {
  userId: number;
  role: UserRole;
}

export const generateToken = (payload: TokenPayload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
