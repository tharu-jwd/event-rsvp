// Deterministic demo data — wipes and rebuilds the events/rsvps/users tables
// so `npm run seed` always produces the same, presentable state. Run it
// after the server has created the schema at least once (or just start the
// server first; schema.sql is idempotent).
const bcrypt = require('bcryptjs');
const db = require('./db');
const { makeSlug } = require('./lib/slug');

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

function run() {
  db.exec('DELETE FROM rsvps; DELETE FROM events; DELETE FROM sessions; DELETE FROM users;');

  const passwordHash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
  );
  const priya = insertUser.run('Priya Nair', 'priya@example.com', passwordHash, iso(-90 * DAY));
  const sam = insertUser.run('Sam Okafor', 'sam@example.com', passwordHash, iso(-60 * DAY));

  const insertEvent = db.prepare(
    `INSERT INTO events
       (organizer_id, slug, title, description, location, starts_at, ends_at, capacity, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  function event(organizerId, title, description, location, startOffset, endOffset, capacity, status = 'published') {
    const slug = makeSlug(title);
    const createdAt = iso(-14 * DAY);
    const info = insertEvent.run(
      organizerId,
      slug,
      title,
      description,
      location,
      iso(startOffset),
      endOffset ? iso(endOffset) : null,
      capacity,
      status,
      createdAt,
      createdAt
    );
    return { id: info.lastInsertRowid, slug };
  }

  const insertRsvp = db.prepare(
    `INSERT INTO rsvps (event_id, name, email, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  function rsvp(eventId, name, email, status, createdOffset) {
    const t = iso(createdOffset);
    insertRsvp.run(eventId, name, email, status, t, t);
  }

  // Upcoming, plenty of room.
  const meetup = event(
    priya.lastInsertRowid,
    'Engineering Careers Meetup',
    'Panel discussion with engineers from local startups, followed by networking. Bring questions about breaking into the industry.',
    'Level 3, Innovation Hub, 42 King St',
    5 * DAY,
    5 * DAY + 3 * 60 * 60 * 1000,
    100
  );
  const meetupAttendees = [
    ['Alex Chen', 'alex.chen@example.com'],
    ['Jordan Blake', 'jordan.blake@example.com'],
    ['Morgan Lee', 'morgan.lee@example.com'],
    ['Taylor Reed', 'taylor.reed@example.com'],
  ];
  meetupAttendees.forEach(([name, email], i) => rsvp(meetup.id, name, email, 'attending', -i * DAY));
  rsvp(meetup.id, 'Casey Wu', 'casey.wu@example.com', 'not_attending', -1 * DAY);

  // Nearly full — good for showing the capacity bar close to the edge.
  const workshop = event(
    priya.lastInsertRowid,
    'React Workshop',
    'Hands-on session building a small app with React and hooks. Laptop required. Beginner-friendly.',
    'Room 214, Computer Science Building',
    9 * DAY,
    9 * DAY + 4 * 60 * 60 * 1000,
    12
  );
  const workshopNames = [
    'Riley Adams', 'Drew Kim', 'Jamie Park', 'Skyler Cruz', 'Rowan Diaz',
    'Quinn Foster', 'Avery Brooks', 'Emerson Hale', 'Finley Grant', 'Harper Voss',
  ];
  workshopNames.forEach((name, i) =>
    rsvp(workshop.id, name, `${name.toLowerCase().replace(' ', '.')}@example.com`, 'attending', -i)
  );

  // Full — the "capacity reached" state for the README screenshot.
  const talk = event(
    sam.lastInsertRowid,
    'AI Research Talk',
    'A researcher from the university AI lab presents recent work on efficient model training, with Q&A.',
    'Lecture Theatre B, Science Precinct',
    3 * DAY,
    3 * DAY + 90 * 60 * 1000,
    8
  );
  const talkNames = [
    'Nina Torres', 'Owen Blake', 'Ines Faulk', 'Leo Marsh',
    'Zara Holt', 'Milo Vance', 'Cleo Ward', 'Theo Lang',
  ];
  talkNames.forEach((name, i) =>
    rsvp(talk.id, name, `${name.toLowerCase().replace(' ', '.')}@example.com`, 'attending', -i)
  );

  // Past event — should read as history, not something to RSVP to.
  const design = event(
    sam.lastInsertRowid,
    'Product Design Session',
    'Retro on the Q1 redesign: what worked, what didn\'t, and what we\'re carrying into Q2.',
    'Online via video call',
    -10 * DAY,
    -10 * DAY + 2 * 60 * 60 * 1000,
    30
  );
  ['Ivy Chan', 'Noah Petit', 'Wren Sato'].forEach((name, i) =>
    rsvp(design.id, name, `${name.toLowerCase().replace(' ', '.')}@example.com`, 'attending', -20 - i)
  );

  // Cancelled — exercises the "event cancelled" UI state.
  event(
    priya.lastInsertRowid,
    'Startup Pitch Night',
    'Five local founders pitch, judged by a panel of investors.',
    'The Loft, 9 Market St',
    12 * DAY,
    null,
    50,
    'cancelled'
  );

  console.log('Seeded database with demo organizers, events, and RSVPs.');
  console.log('Login as priya@example.com or sam@example.com, password: password123');
}

run();
