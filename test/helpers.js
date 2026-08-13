// Runs before anything else in the process requires server/db, so the app
// under test always talks to a throwaway in-memory database — never the
// real data/app.db file.
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const { createApp } = require('../server/app');
const db = require('../server/db');

function resetDb() {
  db.exec('DELETE FROM rsvps; DELETE FROM events; DELETE FROM sessions; DELETE FROM users;');
}

function freshApp() {
  resetDb();
  return createApp();
}

module.exports = { freshApp, db, resetDb };
