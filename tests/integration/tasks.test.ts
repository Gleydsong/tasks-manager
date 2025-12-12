import request from 'supertest';
import { UserRole } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';

const createAdmin = async () => {
  const password = 'AdminPassword123!';
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email,
      password: await hashPassword(password),
      role: UserRole.admin,
    },
  });
  return { admin, password };
};

const registerMember = async (name: string) => {
  const email = `member-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

const setupTeamWithMember = async (adminToken: string, member: { id: number }) => {
  const teamRes = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Team ${Date.now()}`, description: 'Test team' })
    .expect(201);

  const teamId = teamRes.body.data.id;

  await request(app)
    .post(`/api/teams/${teamId}/members`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId: member.id })
    .expect(201);

  return teamId;
};

describe('Task endpoints', () => {
  describe('POST /api/tasks - Create task', () => {
    it('admin can create a task for any team member', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Task Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Task',
          description: 'Task created by admin',
          teamId,
          assignedTo: member.id,
          priority: 'Alta',
          status: 'Pendente',
        })
        .expect(201);

      expect(res.body.data.title).toBe('Admin Created Task');
      expect(res.body.data.description).toBe('Task created by admin');
      expect(res.body.data.priority).toBe('Alta');
      expect(res.body.data.status).toBe('Pendente');
      expect(res.body.data.assignedTo).toBe(member.id);
      expect(res.body.data.teamId).toBe(teamId);
    });

    it('member can create a task assigned to themselves', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Self Assign Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Self Assigned Task',
          teamId,
          assignedTo: member.id,
        })
        .expect(201);

      expect(res.body.data.title).toBe('Self Assigned Task');
      expect(res.body.data.assignedTo).toBe(member.id);
    });

    it('member cannot create a task assigned to another user', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1, token: memberToken } = await registerMember('Member One');
      const { user: member2 } = await registerMember('Member Two');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Shared Team' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member2.id })
        .expect(201);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Assign to Other',
          teamId,
          assignedTo: member2.id,
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('member cannot create a task for a team they do not belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Outsider');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Private Team' })
        .expect(201);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Task',
          teamId: teamRes.body.data.id,
          assignedTo: member.id,
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when assigning to non-existent user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost User Team' })
        .expect(201);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Ghost Task',
          teamId: teamRes.body.data.id,
          assignedTo: 999999,
        })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when creating task for non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'No Team Task',
          teamId: 999999,
          assignedTo: admin.id,
        })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('creates task with default status and priority when not provided', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Default Values Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Default Task',
          teamId,
          assignedTo: member.id,
        })
        .expect(201);

      expect(res.body.data.status).toBe('Pendente');
      expect(res.body.data.priority).toBe('Média');
    });

    it('rejects task creation with invalid title', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Invalid Title Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'A', // too short (min 2)
          teamId,
          assignedTo: member.id,
        })
        .expect(422);
    });

    it('requires authentication to create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'No Auth Task',
          teamId: 1,
          assignedTo: 1,
        })
        .expect(401);

      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/tasks - List tasks', () => {
    it('admin can see all tasks', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('List All Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task One', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task Two', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('member can only see tasks from their teams', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: memberA, token: tokenA } = await registerMember('Member A List');
      const { user: memberB } = await registerMember('Member B List');

      const team1 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team A' })
        .expect(201);

      const team2 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team B' })
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

      const taskA = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task for A', teamId: team1.body.data.id, assignedTo: memberA.id })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task for B', teamId: team2.body.data.id, assignedTo: memberB.id })
        .expect(201);

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskA.body.data.id);
    });

    it('filters tasks by teamId', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Filter Team Member');

      const team1 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Filter Team 1' })
        .expect(201);

      const team2 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Filter Team 2' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${team1.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${team2.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Team 1 Task', teamId: team1.body.data.id, assignedTo: member.id })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Team 2 Task', teamId: team2.body.data.id, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks?teamId=${team1.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((t: any) => t.teamId === team1.body.data.id)).toBe(true);
    });

    it('filters tasks by status', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Filter Status Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Pending Task', teamId, assignedTo: member.id, status: 'Pendente' })
        .expect(201);

      const completedTask = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Completed Task', teamId, assignedTo: member.id, status: 'Concluído' })
        .expect(201);

      const res = await request(app)
        .get('/api/tasks?status=Concluído')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const completedTasks = res.body.data.filter((t: any) => t.status === 'Concluído');
      expect(completedTasks.some((t: any) => t.id === completedTask.body.data.id)).toBe(true);
    });

    it('filters tasks by priority', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Filter Priority Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const highTask = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'High Priority', teamId, assignedTo: member.id, priority: 'Alta' })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Low Priority', teamId, assignedTo: member.id, priority: 'Baixa' })
        .expect(201);

      const res = await request(app)
        .get('/api/tasks?priority=Alta')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const highTasks = res.body.data.filter((t: any) => t.priority === 'Alta');
      expect(highTasks.some((t: any) => t.id === highTask.body.data.id)).toBe(true);
    });

    it('supports pagination', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Pagination Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      // Create 5 tasks
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: `Paginated Task ${i}`, teamId, assignedTo: member.id })
          .expect(201);
      }

      const page1 = await request(app)
        .get('/api/tasks?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1.body.data.length).toBeLessThanOrEqual(2);
      expect(page1.body.meta.page).toBe(1);
      expect(page1.body.meta.pageSize).toBe(2);
    });

    it('member cannot filter by team they do not belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Restricted Member');

      const team1 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Member Team' })
        .expect(201);

      const team2 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Other Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${team1.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks?teamId=${team2.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/tasks/:id - Get task details', () => {
    it('admin can view any task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('View Task Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Viewable Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.title).toBe('Viewable Task');
    });

    it('member can view task from their team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Team View Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Team Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.data.title).toBe('Team Task');
    });

    it('member cannot view task from team they do not belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1 } = await registerMember('Team One Member');
      const { token: tokenMember2 } = await registerMember('Team Two Member');

      const teamId = await setupTeamWithMember(adminToken, member1);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Private Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenMember2}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .get('/api/tasks/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/tasks/:id - Update task', () => {
    it('admin can update any task field', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Update Task Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Original Title', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'New description',
          priority: 'Alta',
        })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.description).toBe('New description');
      expect(res.body.data.priority).toBe('Alta');
    });

    it('member can update their own task (title, description, status, priority)', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Self Update Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Member Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Member Updated',
          status: 'Em progresso',
        })
        .expect(200);

      expect(res.body.data.title).toBe('Member Updated');
      expect(res.body.data.status).toBe('Em progresso');
    });

    it('member cannot update task assigned to another user', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1 } = await registerMember('Owner Member');
      const { token: tokenMember2 } = await registerMember('Other Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Shared Team Update' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Owner Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenMember2}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('member cannot reassign task', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1, token: memberToken } = await registerMember('Reassign Member 1');
      const { user: member2 } = await registerMember('Reassign Member 2');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Reassign Team' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member2.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Reassign Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ assignedTo: member2.id })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('member cannot move task to another team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Move Team Member');

      const team1 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Original Team' })
        .expect(201);

      const team2 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Target Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${team1.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${team2.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Stuck Task', teamId: team1.body.data.id, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ teamId: team2.body.data.id })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('admin can reassign task to another team member', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member1 } = await registerMember('Reassign From');
      const { user: member2 } = await registerMember('Reassign To');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Reassign Team' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member2.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Reassignable Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: member2.id })
        .expect(200);

      expect(res.body.data.assignedTo).toBe(member2.id);
    });

    it('returns 404 when updating non-existent task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .put('/api/tasks/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost Update' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('records history when status changes via update', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('History Update Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'History Task', teamId, assignedTo: member.id, status: 'Pendente' })
        .expect(201);

      await request(app)
        .put(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Concluído' })
        .expect(200);

      const historyRes = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(historyRes.body.data[0].oldStatus).toBe('Pendente');
      expect(historyRes.body.data[0].newStatus).toBe('Concluído');
    });
  });

  describe('PATCH /api/tasks/:id/status - Update task status', () => {
    it('admin can update status of any task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Status Update Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Status Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Em progresso' })
        .expect(200);

      expect(res.body.data.status).toBe('Em progresso');
    });

    it('member can update status of their assigned task', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Member Status Update');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Member Status Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'Concluído' })
        .expect(200);

      expect(res.body.data.status).toBe('Concluído');
    });

    it('member cannot update status of task not assigned to them', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1 } = await registerMember('Assigned Member');
      const { token: tokenMember2 } = await registerMember('Not Assigned Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Status Team' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Protected Status Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${tokenMember2}`)
        .send({ status: 'Concluído' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('records history when status changes', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('History Status Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'History Status Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Em progresso' })
        .expect(200);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Concluído' })
        .expect(200);

      const historyRes = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyRes.body.data).toHaveLength(2);
    });

    it('does not record history when status is the same', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Same Status Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Same Status Task', teamId, assignedTo: member.id, status: 'Pendente' })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Pendente' })
        .expect(200);

      const historyRes = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyRes.body.data).toHaveLength(0);
    });

    it('rejects invalid status value', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Invalid Status Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Invalid Status Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'InvalidStatus' })
        .expect(422);
    });

    it('returns 404 for non-existent task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .patch('/api/tasks/999999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Concluído' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/tasks/:id - Delete task', () => {
    it('admin can delete any task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Delete Task Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Deletable Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .delete(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify task is deleted
      await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('member can delete their own task', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Self Delete Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Self Delete Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .delete(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(204);
    });

    it('member cannot delete task assigned to another user', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1 } = await registerMember('Task Owner Delete');
      const { token: tokenMember2 } = await registerMember('Delete Attacker');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Delete Team' })
        .expect(201);

      const teamId = teamRes.body.data.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Protected Delete Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .delete(`/api/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenMember2}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when deleting non-existent task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .delete('/api/tasks/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/tasks/:id/history - Get task history', () => {
    it('admin can view history of any task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('History View Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'History View Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Concluído' })
        .expect(200);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].oldStatus).toBe('Pendente');
      expect(res.body.data[0].newStatus).toBe('Concluído');
    });

    it('member can view history of task from their team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Team History Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Team History Task', teamId, assignedTo: member.id })
        .expect(201);

      await request(app)
        .patch(`/api/tasks/${taskRes.body.data.id}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'Em progresso' })
        .expect(200);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('member cannot view history of task from team they do not belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1 } = await registerMember('History Owner');
      const { token: tokenMember2 } = await registerMember('History Outsider');

      const teamId = await setupTeamWithMember(adminToken, member1);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Private History Task', teamId, assignedTo: member1.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${tokenMember2}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent task', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .get('/api/tasks/999999/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns empty array for task with no status changes', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('No History Member');

      const teamId = await setupTeamWithMember(adminToken, member);

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No History Task', teamId, assignedTo: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/tasks/${taskRes.body.data.id}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });
});
