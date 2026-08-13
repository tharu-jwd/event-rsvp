# 2. RSVP uniqueness enforced at the database level

## Status

Accepted

## Context

An attendee RSVPing twice, whether from a double-click, a retried request after a dropped connection, or just visiting the page again later, should not create two RSVP rows for the same person. The application code could try to prevent this by checking for an existing RSVP before inserting a new one, but that check has the same race condition as the capacity check in ADR 1: two near-simultaneous requests can both see "no existing RSVP" and both insert.

## Decision

`rsvps` has `UNIQUE (event_id, email)` (see `server/schema.sql`). The RSVP endpoint is a single upsert, not separate create/update endpoints: it looks up the existing row for that `(event_id, email)` pair inside the same transaction used for the capacity check, and either updates it or inserts a new one (`server/routes/rsvps.js`).

This makes RSVPing idempotent by construction. Submitting the same email twice with the same status is a no-op the second time (it updates `updated_at` and returns `200` instead of `201`). Submitting it with a different status (attending to not attending, or back again) updates the existing row in place. There's never a path that produces two rows for the same attendee on the same event, because the database rejects it even if the application code somehow tried.

## Consequences

- A retried request after a lost response (the client never saw the `201`, but the server had already committed it) lands on the same row and returns the current state. The attendee doesn't end up registered twice, and they don't need to know whether their first request actually succeeded.
- The uniqueness constraint is the actual enforcement mechanism. The application-level "check for an existing row" is there for control flow (should this be an `INSERT` or `UPDATE`), not for correctness, the same way the capacity count is for decision-making, not for enforcement. If two requests somehow raced past the applicaton check, the constraint would throw and one request would fail cleanly instead of the table ending up with two rows.
- Because attendees aren't authenticated (see ADR 5), "the same attendee" means "the same email address." Someone could technically RSVP once per email address they have access to. That's a deliberate limitation, not an oversight.

## Alternatives considered

- **Application-level duplicate check only, no constraint.** Rejected: same race condition as the naive capacity check, just for a different invariant.
- **Separate `POST` (create) and `PATCH` (update) endpoints`.** This is closer to what a REST style guide would suggest, and it's what the client would need to know in advance whether it's creating or updating. In practice the client doesn't reliably know that (was there already an RSVP from a previous visit, on a previous device?), so the upsert is both simpler and the only version that's actually idempotent under retries. `DELETE` is still a separate endpoint for actually removing an RSVP, since that's an unambiguous operation.
