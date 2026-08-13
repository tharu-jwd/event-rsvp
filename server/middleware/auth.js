const crypto = require('crypto');
const db = require('../db');
const { now } = require('../lib/time');
const { UnauthorizedError } = require('../lib/errors');

const SESSION_COOKIE = 'session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Server-side sessions, not JWT: a session is a random, unguessable token
// looked up against the sessions table on every request. No signing secret
// to manage, and logout/expiry is a DELETE instead of a token-blocklist.
// Fine at this scale — see docs/adr/0006-session-auth.md.
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = now();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, createdAt, expiresAt);
  return { token, expiresAt };
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE);
}

function getUserFromToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.name, users.email
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > ?`
    )
    .get(token, now());
  return row || null;
}

// Attaches req.user when a valid session cookie is present, but never
// rejects the request. Public routes (event detail, RSVP) use this so an
// organizer viewing their own event still gets req.user without every route
// needing two code paths.
function attachUser(req, _res, next) {
  req.user = getUserFromToken(req.cookies?.[SESSION_COOKIE]);
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) return next(new UnauthorizedError());
  next();
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireAuth,
};
