# 5. Attendees identify by email, not by account

## Status

Accepted

## Context

Organizers need real authorization: only the person who created an event should be able to edit or cancel it, which means they need real accounts (see ADR 6). Attendees are a different problem. The original app never asked attendees to create an account, just a name and email, and that matches how RSVPing to a small event actually works: someone gets a link, they say whether they're coming, and that's the entire interaction.

Building full attendee accounts (signup, login, password reset, session management) would double the amount of auth code in the app for a group of users who interact with it once or twice.

## Decision

Attendees remain unauthenticated. An RSVP is identified by `(event_id, email)`, and the only thing that lets someone view, change, or cancel their RSVP is knowing that email address. The client remembers the last name and email an attendee used, in `localStorage`, purely as a convenience so a returning visitor doesn't retype it (`client/lib/useIdentity.js`). That's not a credential; it just prefills a form.

## Consequences

- "A user cannot alter someone else's RSVP" is true in the sense that you need their email to do it, but knowing someone's email is a much weaker bar than authentication. This is a genuine, deliberate limitation: anyone who knows (or guesses) an attendee's email and the event's URL can change or cancel that attendee's RSVP. For the target use case (small, low-stakes organizational events) this is an acceptable trade, comparable to how a calendar invite works. It would not be acceptable for anything higher-stakes.
- Organizer-side authorization has no such caveat. Editing or cancelling an event, or viewing the attendee list, requires a real session tied to the organizer's account and an ownership check against `event.organizer_id` (`server/routes/events.js`). That's the authorization boundary this app actually depends on.
- If attendee-side security ever mattered more (paid events, private guest lists), the fix would be a scoped, single-use link per RSVP (a token in the URL) rather than full accounts, since that solves the "only the intended person can act on this RSVP" problem without asking attendees to register anywhere.

## Alternatives considered

- **Full attendee accounts.** Rejected as disproportionate: this app has no attendee-facing content that needs protecting beyond a single RSVP, and accounts would add real complexity (registration, password resets, email verification) for a one-time interaction.
- **Per-RSVP magic links.** Closer to correct and considered as a future improvement, not built now because the current app has no email-sending infrastructure and adding one just for this would be scope creep relative to what the product needs today.
