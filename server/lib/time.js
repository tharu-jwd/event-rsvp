// Everything is stored and returned as UTC ISO-8601. The client converts to
// the viewer's local timezone for display. See
// docs/adr/0004-timezone-strategy.md for why.

function now() {
  return new Date().toISOString();
}

// Accepts anything Date can parse (an <input type="datetime-local"> value,
// converted to an absolute instant by the browser before it's sent, or a
// full ISO string) and returns a canonical UTC ISO string, or null if the
// input doesn't represent a valid date.
function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = { now, toIso };
