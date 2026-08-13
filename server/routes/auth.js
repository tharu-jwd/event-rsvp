const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { now } = require('../lib/time');
const { ValidationError, UnauthorizedError } = require('../lib/errors');
const {
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  SESSION_COOKIE,
} = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name?.trim()) throw new ValidationError('Name is required');
  if (!email?.trim() || !EMAIL_RE.test(email)) {
    throw new ValidationError('A valid email is required');
  }
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) throw new ValidationError('An account with this email already exists');

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(name.trim(), normalizedEmail, passwordHash, now());

  const user = { id: info.lastInsertRowid, name: name.trim(), email: normalizedEmail };
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ValidationError('Email and password are required');

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase().trim());

  // Same message either way — don't reveal whether the email is registered.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new UnauthorizedError('Incorrect email or password');
  }

  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) destroySession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
