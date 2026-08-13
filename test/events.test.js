const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { freshApp } = require('./helpers');

async function registerOrganizer(app, email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Organizer', email, password: 'password123' });
  return agent;
}

function futureIso(daysFromNow = 7) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

describe('events', () => {
  test('an organizer can create and then fetch their event', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');

    const create = await organizer
      .post('/api/events')
      .send({ title: 'Team Standup', location: 'Room 1', startsAt: futureIso(), capacity: 10 });
    assert.equal(create.status, 201);

    const get = await request(app).get(`/api/events/${create.body.event.slug}`);
    assert.equal(get.status, 200);
    assert.equal(get.body.event.title, 'Team Standup');
    assert.equal(get.body.event.attendingCount, 0);
  });

  test('rejects a non-positive capacity', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');

    const res = await organizer
      .post('/api/events')
      .send({ title: 'Bad Event', location: 'Room 1', startsAt: futureIso(), capacity: 0 });
    assert.equal(res.status, 422);
  });

  test('unauthenticated users cannot create events', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/api/events')
      .send({ title: 'Sneaky Event', location: 'Room 1', startsAt: futureIso(), capacity: 10 });
    assert.equal(res.status, 401);
  });

  test("an organizer cannot edit another organizer's event", async () => {
    const app = freshApp();
    const owner = await registerOrganizer(app, 'owner@example.com');
    const intruder = await registerOrganizer(app, 'intruder@example.com');

    const create = await owner
      .post('/api/events')
      .send({ title: 'Owner Event', location: 'Room 1', startsAt: futureIso(), capacity: 10 });
    const slug = create.body.event.slug;

    const patch = await intruder.patch(`/api/events/${slug}`).send({ title: 'Hijacked' });
    assert.equal(patch.status, 403);

    const del = await intruder.delete(`/api/events/${slug}`);
    assert.equal(del.status, 403);
  });

  test('lowering capacity below current attendance is rejected', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');

    const create = await organizer
      .post('/api/events')
      .send({ title: 'Small Room', location: 'Room 1', startsAt: futureIso(), capacity: 5 });
    const slug = create.body.event.slug;

    for (const email of ['a@example.com', 'b@example.com', 'c@example.com']) {
      await request(app)
        .post(`/api/events/${slug}/rsvp`)
        .send({ name: 'Attendee', email, status: 'attending' });
    }

    const patch = await organizer.patch(`/api/events/${slug}`).send({ capacity: 2 });
    assert.equal(patch.status, 409);

    const get = await request(app).get(`/api/events/${slug}`);
    assert.equal(get.body.event.capacity, 5, 'capacity is unchanged after the rejected update');
  });

  test('cancelling an event sets its status and is idempotent to read', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const create = await organizer
      .post('/api/events')
      .send({ title: 'Doomed Event', location: 'Room 1', startsAt: futureIso(), capacity: 5 });
    const slug = create.body.event.slug;

    const del = await organizer.delete(`/api/events/${slug}`);
    assert.equal(del.status, 204);

    const get = await request(app).get(`/api/events/${slug}`);
    assert.equal(get.body.event.status, 'cancelled');
  });

  test('a 404 is returned for an unknown slug', async () => {
    const app = freshApp();
    const res = await request(app).get('/api/events/does-not-exist');
    assert.equal(res.status, 404);
  });
});
