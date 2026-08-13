# 1. SQLite, and enforcing capacity inside a transaction

## Status

Accepted

## Context

The original app had no concept of capacity at all: RSVPs were appended to a JSON file with no limit. Adding capacity means answering a harder question than "reject the RSVP if the event is full." It means answering it correctly when two people RSVP for the last spot at the same time.

The naive approach:

```
count = SELECT COUNT(*) FROM rsvps WHERE event_id = ? AND status = 'attending'
if count < capacity:
    INSERT INTO rsvps (...)
```

is a check-then-act race. Two requests can both run the `SELECT`, both see one spot free, and both `INSERT`. Now the event has 101 attendees for 100 seats.

There was no database in the project to build this on top of, so the choice of database was open.

## Decision

Use SQLite (via `better-sqlite3`), and do the count-check-and-insert inside a single `BEGIN IMMEDIATE` transaction (see `server/routes/rsvps.js`).

`BEGIN IMMEDIATE` takes SQLite's write lock at the start of the transaction, not when the first write statement runs. That closes the race: if two requests hit the RSVP endpoint for the same event at the same time, the second one blocks until the first transaction commits or rolls back, then reads the count the first transaction actually left behind. There's no window where both read "1 remaining" before either writes.

`better-sqlite3` is also fully synchronous. Inside one Node process, a route handler runs start to finish with no `await` in the middle of the transaction, so nothing else can interleave with it on the event loop regardless of what SQLite does. The transaction is what makes this correct in general (multiple connections, multiple processes); the synchronous single-threaded execution is a second, independent reason it's correct for this specific deployment (one Node process, one SQLite file).

Why SQLite over Postgres: there's already a Docker volume bind-mounted into the API container for the old JSON file (`~/data:/app/data` in the deploy workflow). A SQLite file drops straight into that, so nothing about the deployment changes: no new container, no connection string, no separate credentials to manage on a t3.micro box that's already running two containers behind nginx. Postgres would be the more conventional choice for a "real" full-stack app, and I considered it, but the actual justification for a client-server database here would be concurrent writers from multiple processes, and this app has exactly one API process. SQLite gives the same transactional guarantees for that case with less to operate.

## Consequences

- Capacity is enforced correctly under concurrent requests. Tested directly: `test/rsvp.test.js` fires two RSVP requests at once for a one-seat event and asserts one gets `201` and the other gets `409`.
- The database is a single file (`data/app.db`), which makes local development and backups trivial (copy the file) but also means the API can only scale by running one process against that file. If this ever needed multiple API instances behind a load balancer, that would be the actual point to move to Postgres, not before.
- WAL mode (`journal_mode = WAL` in `server/db.js`) lets reads proceed without blocking on writes, which matters for the public event list and detail pages, but it doesn't affect the correctness argument above.

## Alternatives considered

- **Check-then-insert without a transaction.** Rejected: the whole point of this decision is that it's wrong.
- **Postgres with `SELECT ... FOR UPDATE`.** Would work, and is the standard answer at larger scale. Rejected for now because it adds a second stateful service to a two-container deployment for a guarantee SQLite already provides here.
- **A `UNIQUE` constraint alone.** `UNIQUE(event_id, email)` prevents duplicate RSVPs (see ADR 2) but does nothing for capacity, since two different attendees have two different emails. Capacity requires counting, and counting requires the transaction.
