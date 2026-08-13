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

async function createEvent(organizer, overrides = {}) {
  const res = await organizer.post('/api/events').send({
    title: 'React Workshop',
    location: 'Room 1',
    startsAt: futureIso(),
    capacity: 10,
    ...overrides,
  });
  return res.body.event;
}

describe('RSVP flow', () => {
  test('create event -> attendee RSVPs -> shows up in the attendee list', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer);

    const rsvp = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(rsvp.status, 201);

    const attendees = await organizer.get(`/api/events/${event.slug}/attendees`);
    assert.equal(attendees.status, 200);
    assert.equal(attendees.body.attendees.length, 1);
    assert.equal(attendees.body.attendees[0].email, 'alex@example.com');
  });

  test('the same email RSVPing twice stays a single row (idempotent upsert)', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer);

    const first = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(first.status, 201);

    // Simulates a double-click or a retried request after a lost response.
    const second = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(second.status, 200, 'the second identical request updates, not creates');
    assert.equal(second.body.rsvp.id, first.body.rsvp.id);

    const attendees = await organizer.get(`/api/events/${event.slug}/attendees`);
    assert.equal(attendees.body.attendees.length, 1);
  });

  test('a full event rejects a new RSVP with 409', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer, { capacity: 1 });

    const first = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Sam', email: 'sam@example.com', status: 'attending' });
    assert.equal(second.status, 409);
  });

  test('exactly one of two concurrent requests wins the last remaining place', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer, { capacity: 1 });

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/events/${event.slug}/rsvp`)
        .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' }),
      request(app)
        .post(`/api/events/${event.slug}/rsvp`)
        .send({ name: 'Sam', email: 'sam@example.com', status: 'attending' }),
    ]);

    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], 'one request succeeds, the other gets a conflict');

    const attendees = await organizer.get(`/api/events/${event.slug}/attendees?status=attending`);
    assert.equal(attendees.body.attendees.length, 1, 'capacity was never exceeded');
  });

  test('cancelling an RSVP frees the slot for someone else', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer, { capacity: 1 });

    await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });

    const cancel = await request(app)
      .delete(`/api/events/${event.slug}/rsvp`)
      .send({ email: 'alex@example.com' });
    assert.equal(cancel.status, 204);

    const next = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Sam', email: 'sam@example.com', status: 'attending' });
    assert.equal(next.status, 201);
  });

  test('RSVPs are rejected once the event has started', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer, { startsAt: new Date(Date.now() - 1000).toISOString() });

    const res = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(res.status, 409);
  });

  test('RSVPs are rejected on a cancelled event', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer);
    await organizer.delete(`/api/events/${event.slug}`);

    const res = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'alex@example.com', status: 'attending' });
    assert.equal(res.status, 409);
  });

  test('a rejected email format is a validation error, not a 500', async () => {
    const app = freshApp();
    const organizer = await registerOrganizer(app, 'org@example.com');
    const event = await createEvent(organizer);

    const res = await request(app)
      .post(`/api/events/${event.slug}/rsvp`)
      .send({ name: 'Alex', email: 'not-an-email', status: 'attending' });
    assert.equal(res.status, 422);
  });
});
