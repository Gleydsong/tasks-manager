import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

const clearDb = async () => {
  await prisma.taskHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
};

describe('Auth flows', () => {
  beforeAll(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers and logs in a user', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'Password123!';

    const registerResponse = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email, password })
      .expect(201);

    expect(registerResponse.body.token).toBeDefined();
    expect(registerResponse.body.user.email).toBe(email);

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user.email).toBe(email);
  });
});
