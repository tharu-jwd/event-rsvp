const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { attachUser } = require('./middleware/auth');
const { AppError } = require('./lib/errors');
const authRoutes = require('./routes/auth');
const { router: eventRoutes } = require('./routes/events');
const rsvpRoutes = require('./routes/rsvps');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3001',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/', (req, res) => {
    res.json({ message: 'Event RSVP API', version: process.env.VERSION || '1.0.0' });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/events/:slug/rsvp', rsvpRoutes);

  // Unknown /api/* routes fall through to a clean 404 instead of Express's
  // default HTML error page.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Centralized error handling — every route throws AppError subclasses (or
  // lets validation errors bubble up) instead of hand-rolling res.status()
  // calls. Anything that isn't an AppError is a bug, so it's logged with
  // detail server-side and returned to the client as a generic 500 —
  // stack traces and internal messages never leak into the response.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
