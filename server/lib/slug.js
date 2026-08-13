const crypto = require('crypto');

// "react-workshop-a1b2c3" — readable in a URL, and the random suffix means
// organizers can reuse a title (two "Team Standup" events, say) without a
// collision.
function makeSlug(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'event'}-${suffix}`;
}

module.exports = { makeSlug };
