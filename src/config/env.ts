import dotenv from 'dotenv';

dotenv.config();

const numberOrFallback = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to start the application.');
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Falling back to a development secret.');
}

const config = {
  port: numberOrFallback(process.env.PORT, 3000),
  jwtSecret,
  databaseUrl: process.env.DATABASE_URL,
  bcryptSaltRounds: numberOrFallback(process.env.BCRYPT_SALT_ROUNDS, 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

export default config;
