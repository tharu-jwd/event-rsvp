const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Data persistence
const DATA_DIR = path.join(__dirname, 'data');
const RSVP_FILE = path.join(DATA_DIR, 'rsvps.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RSVP_FILE)) fs.writeFileSync(RSVP_FILE, '[]');

function readRsvps() {
  return JSON.parse(fs.readFileSync(RSVP_FILE, 'utf8'));
}

function writeRsvps(data) {
  fs.writeFileSync(RSVP_FILE, JSON.stringify(data, null, 2));
}

// Edit this to match your event
const EVENT = {
  title: 'Full-Stack Dev Workshop',
  date: 'Saturday, April 19 2025',
  time: '10:00 AM – 2:00 PM AEST',
  location: 'Online via Zoom',
  description:
    'A hands-on workshop covering modern full-stack development with Next.js and Node.js. Open to all skill levels.',
};

// Admin auth middleware
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token === (process.env.ADMIN_PASSWORD || 'admin123')) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Health / root
app.get('/', (req, res) => {
  res.json({ message: 'RSVP API', version: process.env.VERSION || '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Public routes
app.get('/api/event', (req, res) => {
  const rsvps = readRsvps();
  res.json({ ...EVENT, count: rsvps.length });
});

app.post('/api/rsvp', (req, res) => {
  const { name, email } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const rsvps = readRsvps();

  if (rsvps.find((r) => r.email === email.toLowerCase().trim())) {
    return res.status(409).json({ error: 'This email is already registered' });
  }

  const rsvp = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
  };

  rsvps.push(rsvp);
  writeRsvps(rsvps);

  res.status(201).json({ message: "You're registered!", count: rsvps.length });
});

// Admin routes
app.get('/api/rsvps', requireAdmin, (req, res) => {
  const rsvps = readRsvps();
  res.json({ rsvps, count: rsvps.length });
});

app.delete('/api/rsvps/:id', requireAdmin, (req, res) => {
  const rsvps = readRsvps();
  const updated = rsvps.filter((r) => r.id !== req.params.id);

  if (updated.length === rsvps.length) {
    return res.status(404).json({ error: 'Not found' });
  }

  writeRsvps(updated);
  res.json({ message: 'Deleted', count: updated.length });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
