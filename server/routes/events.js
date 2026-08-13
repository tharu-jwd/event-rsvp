const express = require('express');
const db = require('../db');
const { now, toIso } = require('../lib/time');
const { makeSlug } = require('../lib/slug');
const { parsePagination } = require('../lib/pagination');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const attendingCountStmt = db.prepare(
  "SELECT COUNT(*) AS c FROM rsvps WHERE event_id = ? AND status = 'attending'"
);

function serializeEvent(event, organizer) {
  const attending = attendingCountStmt.get(event.id).c;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    capacity: event.capacity,
    status: event.status,
    organizer: organizer ? { id: organizer.id, name: organizer.name } : undefined,
    attendingCount: attending,
    remaining: Math.max(0, event.capacity - attending),
    isFull: attending >= event.capacity,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function getEventBySlugOrThrow(slug) {
  const event = db.prepare('SELECT * FROM events WHERE slug = ?').get(slug);
  if (!event) throw new NotFoundError('Event not found');
  return event;
}

function requireOwnership(event, user) {
  if (event.organizer_id !== user.id) {
    throw new ForbiddenError("You don't have permission to manage this event");
  }
}

function validateEventInput(body, { partial = false } = {}) {
  const input = {};

  if (!partial || body.title !== undefined) {
    if (!body.title?.trim()) throw new ValidationError('Title is required');
    input.title = body.title.trim();
  }
  if (!partial || body.location !== undefined) {
    if (!body.location?.trim()) throw new ValidationError('Location is required');
    input.location = body.location.trim();
  }
  if (!partial || body.description !== undefined) {
    input.description = (body.description || '').trim();
  }
  if (!partial || body.startsAt !== undefined) {
    const startsAt = toIso(body.startsAt);
    if (!startsAt) throw new ValidationError('A valid start date/time is required');
    input.starts_at = startsAt;
  }
  if (!partial || body.endsAt !== undefined) {
    input.ends_at = body.endsAt ? toIso(body.endsAt) : null;
    if (body.endsAt && !input.ends_at) throw new ValidationError('End date/time is invalid');
  }
  if (!partial || body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new ValidationError('Capacity must be a whole number of at least 1');
    }
    input.capacity = capacity;
  }
  if (input.starts_at && input.ends_at && input.ends_at <= input.starts_at) {
    throw new ValidationError('End time must be after the start time');
  }

  return input;
}

// GET /api/events — public discovery list: published, upcoming first.
router.get('/', (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const rows = db
    .prepare(
      `SELECT * FROM events WHERE status = 'published' AND starts_at >= ?
       ORDER BY starts_at ASC LIMIT ? OFFSET ?`
    )
    .all(now(), pageSize, offset);
  const total = db
    .prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'published' AND starts_at >= ?")
    .get(now()).c;

  res.json({
    events: rows.map((e) => serializeEvent(e)),
    page,
    pageSize,
    total,
  });
});

// GET /api/events/mine — events the logged-in organizer created, any status.
router.get('/mine', requireAuth, (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const rows = db
    .prepare(
      `SELECT * FROM events WHERE organizer_id = ?
       ORDER BY starts_at DESC LIMIT ? OFFSET ?`
    )
    .all(req.user.id, pageSize, offset);
  const total = db
    .prepare('SELECT COUNT(*) AS c FROM events WHERE organizer_id = ?')
    .get(req.user.id).c;

  res.json({
    events: rows.map((e) => serializeEvent(e, req.user)),
    page,
    pageSize,
    total,
  });
});

router.post('/', requireAuth, (req, res) => {
  const input = validateEventInput(req.body);
  const timestamp = now();
  const slug = makeSlug(input.title);

  const info = db
    .prepare(
      `INSERT INTO events
         (organizer_id, slug, title, description, location, starts_at, ends_at, capacity, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
    )
    .run(
      req.user.id,
      slug,
      input.title,
      input.description || '',
      input.location,
      input.starts_at,
      input.ends_at || null,
      input.capacity,
      timestamp,
      timestamp
    );

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ event: serializeEvent(event, req.user) });
});

router.get('/:slug', (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  const organizer = db.prepare('SELECT id, name FROM users WHERE id = ?').get(event.organizer_id);
  res.json({ event: serializeEvent(event, organizer) });
});

router.patch('/:slug', requireAuth, (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  requireOwnership(event, req.user);

  const input = validateEventInput(req.body, { partial: true });

  if (input.capacity !== undefined) {
    const attending = attendingCountStmt.get(event.id).c;
    if (input.capacity < attending) {
      throw new ConflictError(
        `Capacity can't be set below the ${attending} attendee(s) already confirmed`
      );
    }
  }

  const merged = { ...event, ...input, updated_at: now() };
  db.prepare(
    `UPDATE events SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?,
       capacity = ?, updated_at = ? WHERE id = ?`
  ).run(
    merged.title,
    merged.description,
    merged.location,
    merged.starts_at,
    merged.ends_at,
    merged.capacity,
    merged.updated_at,
    event.id
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
  res.json({ event: serializeEvent(updated, req.user) });
});

// Cancel, not delete — keeps RSVP history intact and gives attendees
// something meaningful to see instead of a 404.
router.delete('/:slug', requireAuth, (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  requireOwnership(event, req.user);

  db.prepare("UPDATE events SET status = 'cancelled', updated_at = ? WHERE id = ?").run(
    now(),
    event.id
  );
  res.status(204).end();
});

router.get('/:slug/attendees', requireAuth, (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  requireOwnership(event, req.user);

  const { page, pageSize, offset } = parsePagination(req.query);
  const statusFilter = ['attending', 'not_attending'].includes(req.query.status)
    ? req.query.status
    : null;

  const where = statusFilter ? 'WHERE event_id = ? AND status = ?' : 'WHERE event_id = ?';
  const params = statusFilter ? [event.id, statusFilter] : [event.id];

  const rows = db
    .prepare(
      `SELECT id, name, email, status, created_at, updated_at FROM rsvps ${where}
       ORDER BY created_at ASC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM rsvps ${where}`).get(...params).c;

  res.json({
    attendees: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    page,
    pageSize,
    total,
  });
});

module.exports = { router, getEventBySlugOrThrow, serializeEvent, attendingCountStmt };
