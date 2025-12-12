import request from 'supertest';
import app from '../../src/app';

describe('Auth flows', () => {
  it('registers, logs in, and returns profile via /me', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'Password123!';

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password })
      .expect(201);

    expect(registerResponse.body.data.token).toBeDefined();
    expect(registerResponse.body.data.user.email).toBe(email);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const token = loginResponse.body.data.token;
    expect(token).toBeDefined();
    expect(loginResponse.body.data.user.email).toBe(email);

    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.data.user.email).toBe(email);
  });

  it('rejects duplicate registrations for the same email', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const password = 'Password123!';

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First', email, password })
      .expect(201);

    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email, password })
      .expect(409);

    expect(duplicate.body.error.code).toBe('USER_EXISTS');
  });

  it('fails login with invalid credentials', async () => {
    const email = `wrongpass-${Date.now()}@example.com`;
    const password = 'Password123!';

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'BadPassword!' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('requires a token for /me', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects an invalid token on /me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
