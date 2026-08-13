# Engineering notes

Specific scenarios worth being able to explain, and what the app actually does in each one. The reasoning behind the mechanisms mentioned here lives in `docs/adr/`; this doc is about the observable behavior.

## Two attendees competing for the final place

Event has one seat left. Two RSVP requests for `attending` arrive close enough together that, without care, both could see "1 remaining" and both succeed.

What actually happens: `server/routes/rsvps.js` wraps the read-count-then-write in a single `BEGIN IMMEDIATE` transaction. The first request to reach the transaction takes SQLite's write lock immediately; the second blocks until the first commits. By the time the second transaction's `SELECT COUNT(*)` runs, it sees the row the first one just inserted, the count is now at capacity, and it throws a conflict instead of inserting. One request gets `201`, the other gets `409 This event is full`. Covered directly in `test/rsvp.test.js` ("exactly one of two concurrent requests wins the last remaining place"), which fires both requests with `Promise.all` and asserts on the pair of status codes.

## Duplicate RSVP request

Same attendee submits the same RSVP twice, whether from a double-click, a client-side retry, or just re-visiting the page.

`rsvps` has `UNIQUE (event_id, email)`. The RSVP endpoint is an upsert: it looks for an existing row for that email on that event and updates it instead of inserting a second one. The second identical request returns `200` (not `201`) and the row's `id` is unchanged. There's exactly one RSVP per attendee per event, always.

## Server commits the RSVP but the client never sees the response

The write succeeds, the response is lost in transit (dropped connection, closed tab), and the attendee, not knowing it worked, tries again.

This is the same case as the duplicate RSVP above, and it's handled by the same mechanism. The retry lands on the existing row, updates it in place, and returns success. The attendee doesn't end up registered twice, and they don't need to know whether the first attempt actually landed. This is the practical reason the RSVP endpoint is an idempotent upsert rather than a strict "create" that would reject a second attempt.

## Organizer tries to reduce capacity below current attendance

Event has 8 confirmed attendees. Organizer edits it and sets capacity to 5.

Rejected with `409`, and the capacity is left unchanged (`server/routes/events.js`, the `PATCH /api/events/:slug` handler checks the current attending count before applying the update). Silently dropping attendees to fit a lower capacity was never on the table: nobody should lose their spot because of a number the organizer typed after the fact. If the organizer genuinely needs fewer attendees, that's a conversation to have with specific people, not something the API does for them.

## Event becomes full between the attendee loading the page and pressing RSVP

The event page shows "1 spot remaining" when the attendee loads it. By the time they submit the form, someone else has taken it.

The remaining-spots number shown in the UI is a snapshot from whenever the page last fetched the event, nothing more. It is never treated as a guarantee. The actual accept/reject decision happens inside the transaction described above, at submit time, against the current database state, not the state the browser happened to have cached. If the spot's gone, the attendee gets the same `409 This event is full` response as in the concurrent-race case, because from the server's point of view it's the identical situation: a request arrived to find capacity already reached.

## Event already started

An attendee tries to RSVP, or cancel an RSVP, after the event's `starts_at` has passed.

Rejected with `409 This event has already started; RSVPs are closed` (`hasEventStarted` in `server/routes/rsvps.js`). The rule is intentionally simple: it's a straight comparison against `starts_at`, no grace period, no separate "RSVP deadline" field. An event that's already running isn't a sensible thing to be joining or leaving through a self-serve form.

## Event cancelled

Organizer cancels an event that had active RSVPs.

Cancelling sets `status = 'cancelled'` on the event; it does not delete it or touch any RSVP rows (`DELETE /api/events/:slug`, despite the HTTP method, performs a soft cancel, not a hard delete). Attendees who visit the event page see a cancelled banner instead of an RSVP form, and any further RSVP attempt is rejected with `409 This event has been cancelled`. The attendee list is preserved, so the organizer can still see and, if they want to reach out, contact everyone who had said they were coming.

## Database unavailable

The SQLite file can't be opened, or a query fails for some other infrastructure reason.

Every route handler that touches the database is wrapped by the central error handler in `server/app.js`. Anything that isn't one of the app's own typed errors (`AppError` and its subclasses in `server/lib/errors.js`) gets logged server-side with full detail and returned to the client as a generic `500 Something went wrong`, with no stack trace or internal error message in the response body. The frontend's fetch wrapper (`client/lib/api.js`) treats any non-2xx response as a failure and surfaces a generic "something went wrong" message rather than assuming success. Nothing in this path ever reports an RSVP as accepted unless the transaction actually committed.
