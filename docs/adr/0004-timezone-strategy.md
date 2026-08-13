# 4. Store UTC, convert at the client

## Status

Accepted

## Context

The original hardcoded event stored its time as a display string ("10:00 AM – 2:00 PM AEST"). That works for exactly one event in one timezone and falls apart the moment there's more than one organizer, potentially in different timezones, and attendees viewing the event from wherever they are.

## Decision

`events.starts_at` and `events.ends_at` are stored as UTC ISO-8601 strings (`server/lib/time.js`). The API always returns UTC. The client formats to the viewer's local timezone at render time, using `Intl`/`Date.prototype.toLocaleString` with no explicit timezone argument, which uses whatever timezone the browser reports (`client/lib/format.js`).

For event creation, the organizer enters a date and time in an `<input type="datetime-local">`, which is timezone-naive by itself. The browser resolves it against the organizer's local timezone when it's converted to a `Date`, and that's what gets sent to the API. In practice this means: whatever timezone the organizer is physically in when they create the event is treated as the event's timezone. For the kind of single-organization, in-person or single-timezone-audience events this app targets (a university society, a company's internal meetup), that's the correct assumption and matches how the organizer would actually think about the event.

## Consequences

- Any two people looking at the same event, in any timezone, see the same correct local time for it, because what's stored is an absolute instant, not a wall-clock string.
- There's no explicit "event timezone" field shown to attendees (e.g., "10:00 AM AEST" regardless of viewer location). An attendee in a different timezone than the organizer sees the event converted to their own local time, which is correct, but they don't see what timezone the organizer intended. This hasn't mattered for the target use case (small in-person or single-audience events) and isn't built.
- If this needed to support genuinely global audiences where the wall-clock time in the organizer's timezone matters regardless of viewer location, that would need an explicit timezone field on the event instead of inferring it from the organizer's browser. That's a real limitation, not an oversight, and it's out of scope for what this app is trying to be.

## Alternatives considered

- **Store naive local datetimes as strings.** This is what the original app effectively did. Rejected: ambiguous the moment there's more than one timezone involved, and every comparison ("has this event started yet?") becomes unreliable.
- **Ask the organizer to explicitly pick a timezone for the event.** More correct for a genuinely multi-timezone product. Rejected as unnecessary complexity for events that are, in practice, tied to a single physical location or audience.
