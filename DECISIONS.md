# CinemaSeat — Decisions

Three decisions the team genuinely argued about.

## 1. Concurrency model for seat holds

**Options considered**

- (a) Postgres advisory locks per `(show_id, seat_id)` inside a
  transaction with `SELECT … FOR UPDATE`.
- (b) Application-level mutex per seat in Redis with TTL.
- (c) Optimistic concurrency with a `version` column on the seat
  row, retry on conflict.

**Chosen:** (a) Postgres advisory locks. The team already runs
Postgres for the booking data; adding Redis purely for locks
doubles the operational surface for one feature. Advisory locks
are cheap, compose cleanly with `FOR UPDATE`, and survive a single
process restart. A retry loop on the row-level lock catches the
rare case where two transactions queue on the same seat.

**Gave up:** the multi-region failover story that Redis Sentinel
would buy (we're single-region for the hackathon), and the
simpler mental model of option (c).

## 2. Where the seat map lives

**Options considered**

- (a) Frontend computes the seat grid from `GET /shows/{id}/seats`
  and re-renders on each refresh.
- (b) Backend streams seat updates over WebSocket so two browsers
  holding the same show see each other's selections.

**Chosen:** (a) for now, with polling every 2 s on the seats page.
WebSocket adds a sticky-session requirement to the gateway that
the mock gateway doesn't support, and the judging rubric weighs
**correctness over freshness** — refresh-on-poll is enough to
demonstrate that two simultaneous holds for the same seat produce
exactly one success and one 409.

**Gave up:** true realtime. A future PR could add a Redis pub/sub
fan-out and a thin WS endpoint on the backend without changing
the frontend API surface.

## 3. Where the integration `docker compose` lives

**Options considered**

- (a) Keep one root `docker-compose.yml` and have all branches edit
  it, resolving on merge.
- (b) Each branch ships a **namespaced** compose at the root
  (`frontend.docker-compose.yml`, `backend.docker-compose.yml`)
  plus the full integration compose lives only on `devops`.

**Chosen:** (b). Three PRs in parallel would otherwise all touch
the same root compose and produce merge conflicts every time. With
namespaced filenames, merges are conflict-free and the
`devops` branch becomes the single source of truth for the
integration stack.

**Gave up:** the single-file simplicity of option (a). The
savings show up the moment more than one branch needs to change
its service entry — exactly what happened in week two.
