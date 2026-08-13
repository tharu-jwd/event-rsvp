const express = require('express');
const db = require('../db');
const { now } = require('../lib/time');
const { ValidationError, ConflictError, NotFoundError } = require('../lib/errors');
const { getEventBySlugOrThrow, attendingCountStmt } = require('./events');

const router = express.Router({ mergeParams: true });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serializeRsvp(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function hasEventStarted(event) {
  return new Date(event.starts_at).getTime() <= Date.now();
}

// The whole read-check-write happens inside one BEGIN IMMEDIATE transaction,
// so two requests racing for the last spot can't both read "1 remaining"
// and both insert. IMMEDIATE grabs the write lock up front instead of
// upgrading a read lock later, which is what actually closes the race — see
// docs/adr/0001-sqlite-for-capacity-enforcement.md.
const upsertRsvp = db.transaction((event, name, email, status) => {
  const existing = db
    .prepare('SELECT * FROM rsvps WHERE event_id = ? AND email = ?')
    .get(event.id, email);

  if (status === 'attending') {
    const attending = attendingCountStmt.get(event.id).c;
    const alreadyCountedInThatTotal = existing?.status === 'attending';
    const effectiveCount = alreadyCountedInThatTotal ? attending - 1 : attending;
    if (effectiveCount >= event.capacity) {
      throw new ConflictError('This event is full');
    }
  }

  const timestamp = now();
  if (existing) {
    db.prepare('UPDATE rsvps SET name = ?, status = ?, updated_at = ? WHERE id = ?').run(
      name,
      status,
      timestamp,
      existing.id
    );
    return { id: existing.id, created: false };
  }

  const info = db
    .prepare(
      'INSERT INTO rsvps (event_id, name, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(event.id, name, email, status, timestamp, timestamp);
  return { id: info.lastInsertRowid, created: true };
}).immediate;

router.get('/', (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) throw new ValidationError('email is required');

  const rsvp = db
    .prepare('SELECT * FROM rsvps WHERE event_id = ? AND email = ?')
    .get(event.id, email);
  if (!rsvp) throw new NotFoundError('No RSVP found for this email');

  res.json({ rsvp: serializeRsvp(rsvp) });
});

router.post('/', (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  const { name, email, status } = req.body || {};

  if (!name?.trim()) throw new ValidationError('Name is required');
  if (!email?.trim() || !EMAIL_RE.test(email)) {
    throw new ValidationError('A valid email is required');
  }
  if (!['attending', 'not_attending'].includes(status)) {
    throw new ValidationError('status must be "attending" or "not_attending"');
  }
  if (event.status === 'cancelled') {
    throw new ConflictError('This event has been cancelled');
  }
  if (hasEventStarted(event)) {
    throw new ConflictError('This event has already started; RSVPs are closed');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = upsertRsvp(event, name.trim(), normalizedEmail, status);

  const rsvp = db.prepare('SELECT * FROM rsvps WHERE id = ?').get(result.id);
  res.status(result.created ? 201 : 200).json({ rsvp: serializeRsvp(rsvp) });
});

router.delete('/', (req, res) => {
  const event = getEventBySlugOrThrow(req.params.slug);
  const email = (req.body?.email || req.query.email || '').toLowerCase().trim();
  if (!email) throw new ValidationError('email is required');

  if (hasEventStarted(event)) {
    throw new ConflictError('This event has already started; RSVPs are closed');
  }

  const result = db
    .prepare('DELETE FROM rsvps WHERE event_id = ? AND email = ?')
    .run(event.id, email);
  if (result.changes === 0) throw new NotFoundError('No RSVP found for this email');

  res.status(204).end();
});

module.exports = router;
