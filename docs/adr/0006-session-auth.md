# 6. Organizer auth: server-side sessions, not JWT

## Status

Accepted

## Context

The original app had a single hardcoded admin password (with a plaintext fallback baked into the source), compared against one shared token for every request, and stored in `localStorage` on the client. With multiple organizers each owning their own events, that model doesn't work: there needs to be a real account per organizer and a way to prove which organizer is making a request.

## Decision

Passwords are hashed with bcrypt (`server/routes/auth.js`). On login, the server creates a row in a `sessions` table (`token`, `user_id`, `expires_at`) with a random 32-byte token, and sends that token to the browser as an httpOnly, `sameSite=lax` cookie (`server/middleware/auth.js`). Every request that needs to know who's logged in looks the token up against that table.

This is a server-side session, not a JWT. There's no signing secret to generate, rotate, or leak, because the token itself isn't trusted on its own, it's just a lookup key. Logging out is a `DELETE` on that row instead of needing a token blocklist. An expired or revoked session stops working immediately, instead of remaining valid until a JWT's expiry claim catches up.

The cookie is httpOnly so client-side JavaScript can't read it, which rules out the XSS-steals-the-token class of problem that affected the old `localStorage`-based admin password.

## Consequences

- Every authenticated request costs one indexed lookup (`sessions.token`, primary key) joined against `users`. At this scale that's free; it would start to matter only at a request volume this app isn't built for.
- Sessions are a real table, so they show up in the same SQLite file as everything else. No separate session store to run.
- CORS is configured with an explicit origin and `credentials: true` (`server/app.js`) instead of the previous wildcard `cors()`, since cookie-based auth across origins needs the browser to know it's allowed to send credentials to this specific origin.

## Alternatives considered

- **JWT in an httpOnly cookie.** Would also work, and avoids a database lookup per request. Rejected mainly because revocation is awkward (a JWT is valid until it expires, full stop, unless you also build a blocklist, at which point you have most of the complexity of server-side sessions anyway plus a signing secret to manage). For an app this size, "how do I invalidate a session" mattering more than "avoid one indexed lookup" was the deciding factor.
- **Keep the single shared admin password.** Rejected outright: it doesn't support "only the owner can edit their event," which is a hard requirement once there's more than one organizer.
