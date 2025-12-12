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

describe('User endpoints', () => {
  describe('GET /api/users - List users', () => {
    it('admin can list all users', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      // Create some members
      await registerMember('User List Member 1');
      await registerMember('User List Member 2');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3); // admin + 2 members
      // Verify password is not returned
      expect(res.body.data[0].password).toBeUndefined();
    });

    it('member cannot list users', async () => {
      const { token: memberToken } = await registerMember('Unauthorized Lister');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('requires authentication to list users', async () => {
      const res = await request(app).get('/api/users').expect(401);

      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/users/:id - Get user details', () => {
    it('admin can view any user details', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Viewable User');

      const res = await request(app)
        .get(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(member.id);
      expect(res.body.data.name).toBe('Viewable User');
      expect(res.body.data.password).toBeUndefined();
    });

    it('admin can view their own details', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .get(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(admin.id);
      expect(res.body.data.email).toBe(admin.email);
    });

    it('member cannot view user details', async () => {
      const { admin } = await createAdmin();
      const { token: memberToken } = await registerMember('Nosy Member');

      const res = await request(app)
        .get(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/users/:id - Update user', () => {
    it('admin can update user name', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Original Name');

      const res = await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.password).toBeUndefined();
    });

    it('admin can update user role to admin', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Promotable Member');

      const res = await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.data.role).toBe('admin');
    });

    it('admin can update user role to member', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      // Create another admin
      const otherAdmin = await prisma.user.create({
        data: {
          name: 'Demotable Admin',
          email: `demote-${Date.now()}@example.com`,
          password: await hashPassword('Password123!'),
          role: UserRole.admin,
        },
      });

      const res = await request(app)
        .patch(`/api/users/${otherAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'member' })
        .expect(200);

      expect(res.body.data.role).toBe('member');
    });

    it('admin can update both name and role', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Multi Update');

      const res = await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name', role: 'admin' })
        .expect(200);

      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.role).toBe('admin');
    });

    it('member cannot update users', async () => {
      const { user: member1, token: memberToken } = await registerMember('Hacker Member');
      const { user: member2 } = await registerMember('Target Member');

      const res = await request(app)
        .patch(`/api/users/${member2.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('member cannot update their own role', async () => {
      const { user: member, token: memberToken } = await registerMember('Self Promote');

      const res = await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when updating non-existent user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .patch('/api/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost User' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects update with no fields', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Empty Update');

      await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);
    });

    it('rejects update with invalid name', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Invalid Name Update');

      await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A' }) // too short (min 2)
        .expect(422);
    });

    it('rejects update with invalid role', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Invalid Role Update');

      await request(app)
        .patch(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' }) // invalid role
        .expect(422);
    });
  });

  describe('DELETE /api/users/:id - Delete user', () => {
    it('admin can delete a user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);
      const { user: member } = await registerMember('Deletable User');

      await request(app)
        .delete(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify user is deleted
      await request(app)
        .get(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin can delete another admin', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const otherAdmin = await prisma.user.create({
        data: {
          name: 'Deletable Admin',
          email: `delete-admin-${Date.now()}@example.com`,
          password: await hashPassword('Password123!'),
          role: UserRole.admin,
        },
      });

      await request(app)
        .delete(`/api/users/${otherAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('member cannot delete users', async () => {
      const { user: member1, token: memberToken } = await registerMember('Delete Blocker');
      const { user: member2 } = await registerMember('Delete Target');

      const res = await request(app)
        .delete(`/api/users/${member2.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('member cannot delete themselves', async () => {
      const { user: member, token: memberToken } = await registerMember('Self Delete');

      const res = await request(app)
        .delete(`/api/users/${member.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when deleting non-existent user', async () => {
      const { admin, password } = await createAdmin();
      const adminToken = await login(admin.email, password);

      const res = await request(app)
        .delete('/api/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
