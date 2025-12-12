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
});
