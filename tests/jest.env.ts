import dotenv from 'dotenv';
import path from 'path';

process.env.NODE_ENV = 'test';

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

// Usar banco de dados de teste
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://postgres:postgres@localhost:5432/tasks_manager_test?schema=public';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.BCRYPT_SALT_ROUNDS = '4';
