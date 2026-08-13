const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { freshApp } = require('./helpers');

describe('organizer auth', () => {
  test('registers with a valid name/email/password', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'password123' });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'priya@example.com');
    assert.ok(res.headers['set-cookie'], 'sets a session cookie');
  });

  test('rejects a weak password', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'short' });

    assert.equal(res.status, 422);
  });

  test('rejects a duplicate email', async () => {
    const app = freshApp();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone else', email: 'priya@example.com', password: 'password123' });

    assert.equal(res.status, 422);
  });

  test('login fails with the wrong password', async () => {
    const app = freshApp();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya@example.com', password: 'wrong-password' });

    assert.equal(res.status, 401);
  });

  test('/me requires a session', async () => {
    const app = freshApp();
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('/me returns the logged-in user with a valid session', async () => {
    const app = freshApp();
    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'password123' });

    const res = await agent.get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'priya@example.com');
  });
});
