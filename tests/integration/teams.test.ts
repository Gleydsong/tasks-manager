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

describe('Team endpoints', () => {
  describe('POST /api/teams - Create team', () => {
    it('allows admin to create a team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Engineering Team', description: 'Backend developers' })
        .expect(201);

      expect(res.body.data.name).toBe('Engineering Team');
      expect(res.body.data.description).toBe('Backend developers');
      expect(res.body.data.id).toBeDefined();
    });

    it('allows admin to create a team without description', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Marketing Team' })
        .expect(201);

      expect(res.body.data.name).toBe('Marketing Team');
      expect(res.body.data.description).toBeNull();
    });

    it('blocks member from creating a team', async () => {
      const { token: memberToken } = await registerMember('Regular Member');

      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Unauthorized Team' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects team creation with invalid name', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A' }) // too short (min 2)
        .expect(422);
    });

    it('requires authentication to create a team', async () => {
      const res = await request(app)
        .post('/api/teams')
        .send({ name: 'No Auth Team' })
        .expect(401);

      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/teams - List teams', () => {
    it('admin can see all teams', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      // Create some teams
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Alpha' })
        .expect(201);

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Beta' })
        .expect(201);

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('member can only see teams they belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Member List Test');

      // Create two teams
      const team1 = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Member Team ${Date.now()}` })
        .expect(201);

      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Other Team ${Date.now()}` })
        .expect(201);

      // Add member to only one team
      await request(app)
        .post(`/api/teams/${team1.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(team1.body.data.id);
    });
  });

  describe('GET /api/teams/:teamId - Get team details', () => {
    it('admin can view any team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Viewable Team', description: 'Test description' })
        .expect(201);

      const res = await request(app)
        .get(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.name).toBe('Viewable Team');
      expect(res.body.data.description).toBe('Test description');
    });

    it('member can view team they belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Member View Test');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Member Viewable Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .get(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.data.name).toBe('Member Viewable Team');
    });

    it('member cannot view team they do not belong to', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { token: memberToken } = await registerMember('Outsider Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Private Team' })
        .expect(201);

      const res = await request(app)
        .get(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .get('/api/teams/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/teams/:teamId - Update team', () => {
    it('admin can update team name and description', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Original Name', description: 'Original description' })
        .expect(201);

      const res = await request(app)
        .patch(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', description: 'Updated description' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.description).toBe('Updated description');
    });

    it('admin can update only the name', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Name Only Team', description: 'Keep this' })
        .expect(201);

      const res = await request(app)
        .patch(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name Only' })
        .expect(200);

      expect(res.body.data.name).toBe('New Name Only');
      expect(res.body.data.description).toBe('Keep this');
    });

    it('member cannot update a team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Update Blocker');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Update Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .patch(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when updating non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .patch('/api/teams/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Team' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/teams/:teamId - Delete team', () => {
    it('admin can delete a team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Deletable Team' })
        .expect(201);

      await request(app)
        .delete(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify team is deleted
      await request(app)
        .get(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('member cannot delete a team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member, token: memberToken } = await registerMember('Delete Blocker');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Undeletable Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .delete(`/api/teams/${teamRes.body.data.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when deleting non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .delete('/api/teams/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/teams/:teamId/members - Add member', () => {
    it('admin can add a member to a team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('New Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team With Members' })
        .expect(201);

      const res = await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      expect(res.body.data.userId).toBe(member.id);
      expect(res.body.data.teamId).toBe(teamRes.body.data.id);
    });

    it('cannot add the same member twice', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Duplicate Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Duplicates Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 404 when adding member to non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Lost Member');

      const res = await request(app)
        .post('/api/teams/999999/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when adding non-existent user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost User Team' })
        .expect(201);

      const res = await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 999999 })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('member cannot add members to a team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1, token: memberToken } = await registerMember('Member One');
      const { user: member2 } = await registerMember('Member Two');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Restricted Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      const res = await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: member2.id })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/teams/:teamId/members/:userId - Remove member', () => {
    it('admin can remove a member from a team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Removable Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Removal Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member.id })
        .expect(201);

      const res = await request(app)
        .delete(`/api/teams/${teamRes.body.data.id}/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.userId).toBe(member.id);
    });

    it('returns 404 when removing non-member from team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Non Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Empty Team' })
        .expect(201);

      const res = await request(app)
        .delete(`/api/teams/${teamRes.body.data.id}/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when removing from non-existent team', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Orphan Member');

      const res = await request(app)
        .delete(`/api/teams/999999/members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('member cannot remove members from a team', async () => {
      const { admin, password: adminPassword } = await createAdmin();
      const adminToken = await login(admin.email, adminPassword);
      const { user: member1, token: memberToken } = await registerMember('Keeper Member');
      const { user: member2 } = await registerMember('Target Member');

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Protected Team' })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member1.id })
        .expect(201);

      await request(app)
        .post(`/api/teams/${teamRes.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: member2.id })
        .expect(201);

      const res = await request(app)
        .delete(`/api/teams/${teamRes.body.data.id}/members/${member2.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

