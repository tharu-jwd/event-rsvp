# 3. Stay a monolith

## Status

Accepted

## Context

The application has three real workloads: serve the public event pages, let attendees RSVP, and let organizers manage their events. All three read and write the same handful of tables and need the same transactional guarantees (particularly the capacity logic in ADR 1). None of them has a load profile, release cadence, or team boundary that would justify running as a separate service.

## Decision

One Express app (`server/app.js`), one SQLite database, one Next.js client. Routes are split into modules by resource (`server/routes/auth.js`, `events.js`, `rsvps.js`) for readability, not as service boundaries. There's no message queue, no internal API between "services," no shared-nothing deployment.

## Consequences

- A transaction can span the capacity check and the RSVP write because they're the same process talking to the same database. Splitting RSVPs and events into separate services would turn that into a distributed transaction (or a saga, or an eventually-consistent workaround), which would make the concurrency story in ADR 1 much harder to get right for no actual benefit.
- Deployment stays what it already was: two containers (API, client) behind nginx on one EC2 instance. Nothing new to orchestrate.
- If this needed to scale past what one API process and one SQLite file can handle, the honest next step would be Postgres and multiple API instances behind the load balancer, still one service, before reaching for anything resembling microservices.

## Alternatives considered

- **Split RSVPs into their own service.** No justification: it's the same data, the same consistency requirements, and there's no independent scaling or ownership reason to do it.
- **A generic repository/service-layer pattern inside the monolith**, to "prepare for" a future split. Rejected: it would add indirection now for a split that may never happen, and the route modules are already a clean enough boundary for a codebase this size.
