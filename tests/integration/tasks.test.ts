import request from 'supertest';
import { UserRole } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';

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

const registerMember = async (name: string) => {
  const email = `member-${Date.now()}@example.com`;
  const password = 'MemberPassword123!';

  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password })
    .expect(201);

  return {
    user: response.body.data.user,
    password,
    token: response.body.data.token,
  };
};

const login = async (email: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.data.token as string;
};

describe('Task permissions and history', () => {
  it('allows member assignee to update status and records history', async () => {
    const { admin, password: adminPassword } = await createAdmin();
    const adminToken = await login(admin.email, adminPassword);

    const { user: member, token: memberToken } = await registerMember('Member One');

    const teamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team Alpha', description: 'Testing team' })
      .expect(201);
    const teamId = teamRes.body.data.id;

    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member.id })
      .expect(201);

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Task',
        description: 'A task to test permission',
        teamId,
        assignedTo: member.id,
        priority: 'Alta',
      })
      .expect(201);

    const taskId = taskRes.body.data.id;

    const update = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'Concluído' })
      .expect(200);

    expect(update.body.data.status).toBe('Concluído');

    const historyRes = await request(app)
      .get(`/api/tasks/${taskId}/history`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(historyRes.body.data).toHaveLength(1);
    expect(historyRes.body.data[0].newStatus).toBe('Concluído');
  });

  it('blocks member from creating tasks for others or outside team', async () => {
    const { user: member, token: memberToken } = await registerMember('Member Two');

    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Nope' })
      .expect(403);

    const { admin, password: adminPassword } = await createAdmin();
    const adminToken = await login(admin.email, adminPassword);
    const teamAlpha = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team Beta' })
      .expect(201);

    const teamId = teamAlpha.body.data.id;

    // not a member yet; cannot create task
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Should fail',
        teamId,
        assignedTo: member.id,
      })
      .expect(403);

    // add member then create task but must assign to self
    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member.id })
      .expect(201);

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Member-owned task',
        teamId,
        assignedTo: member.id,
      })
      .expect(201);

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Invalid assignee',
        teamId,
        assignedTo: member.id + 999,
      })
      .expect(404);
  });

  it('enforces list filters and team visibility for members', async () => {
    const { admin, password: adminPassword } = await createAdmin();
    const adminToken = await login(admin.email, adminPassword);
    const { user: memberA, token: tokenA } = await registerMember('Member A');
    const { user: memberB } = await registerMember('Member B');

    const team1 = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team One' })
      .expect(201);
    const team2 = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team Two' })
      .expect(201);

    await request(app)
      .post(`/api/teams/${team1.body.data.id}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberA.id })
      .expect(201);

    await request(app)
      .post(`/api/teams/${team2.body.data.id}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberB.id })
      .expect(201);

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Task Team1',
        teamId: team1.body.data.id,
        assignedTo: memberA.id,
        priority: 'Média',
      })
      .expect(201);

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Task Team2',
        teamId: team2.body.data.id,
        assignedTo: memberB.id,
        priority: 'Alta',
      })
      .expect(201);

    const memberList = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(memberList.body.data).toHaveLength(1);
    expect(memberList.body.data[0].title).toBe('Task Team1');

    await request(app)
      .get(`/api/tasks?teamId=${team2.body.data.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
  });
});
