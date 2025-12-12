import bcrypt from 'bcrypt';
import config from '../config/env';

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, config.bcryptSaltRounds);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
