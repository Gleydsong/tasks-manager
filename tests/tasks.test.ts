import request from 'supertest';
import { UserRole } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';

const clearDb = async () => {
  await prisma.taskHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
};

const createAdmin = async () => {
  const password = 'AdminPassword123!';
  const email = `admin-${Date.now()}@example.com`;
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      password: await hashPassword(password),
      role: UserRole.admin,
    },
  });

  return { admin, password };
};

describe('Task permissions', () => {
  beforeAll(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows assignee member to update task status', async () => {
    const { admin, password: adminPassword } = await createAdmin();

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: admin.email, password: adminPassword })
      .expect(200);

    const adminToken = adminLogin.body.token;

    const memberEmail = `member-${Date.now()}@example.com`;
    const memberPassword = 'MemberPassword123!';

    const memberRegister = await request(app)
      .post('/auth/register')
      .send({ name: 'Member', email: memberEmail, password: memberPassword })
      .expect(201);

    const memberId = memberRegister.body.user.id;
    const memberToken = memberRegister.body.token;

    const team = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team One', description: 'Testing team' })
      .expect(201);

    const teamId = team.body.team.id;

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId })
      .expect(201);

    const task = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Task',
        description: 'A task to test permission',
        teamId,
        assignedTo: memberId,
        priority: 'high',
      })
      .expect(201);

    const taskId = task.body.task.id;

    const update = await request(app)
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(update.body.task.status).toBe('completed');
  });
});
