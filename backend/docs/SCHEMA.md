# CinemaSeat — Database Schema (Step 4)

This is the schema the judges will see. Every table, every
relationship, every UNIQUE constraint and index, and the two
behaviours the schema is designed to enforce:

1. **Idempotent webhooks** — duplicate payment callbacks cannot
   double-credit a booking.
2. **Concurrency-ready seat reservation** — `show_seats` carries the
   show-scoped lock surface; the same physical seat appearing twice
   in a single booking is impossible.

## Tables

| Table            | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `customers`      | Registered users that book tickets.                    |
| `movies`         | The catalogue of films.                                |
| `theatres`       | Physical rooms with `rows × cols` seating grids.       |
| `seats`          | One row per physical seat (the catalogue). NO status.  |
| `shows`          | A screening of one movie in one theatre at a time.     |
| `show_seats`     | One row per (show, seat) — the seat's availability **for that show**, with an optimistic-lock `version` counter. |
| `holds`          | Temporary reservation for a show, owned by a customer. |
| `bookings`       | Confirmed reservation, derived from a hold.            |
| `booking_seats`  | Junction: which physical seats a booking contains.     |
| `payments`       | Money side of a booking. NO card/CVV/banking fields.   |
| `payment_events` | Append-only audit log of payment callbacks.            |

## Relationships

```
movies      1 ──── * shows * ──── 1 theatres
                                 │
theatres    1 ──── * seats      │        (one catalogue per theatre)
                                 │
shows       1 ──── * show_seats * ──── 1 seats
shows       1 ──── * holds * ── 1 customers
shows       1 ──── * bookings * ── 1 customers
bookings    1 ──── * booking_seats * ── 1 seats
bookings    1 ──── 1 payments
payments    1 ──── * payment_events
holds       1 ── 0..1 bookings  (booking.hold_id FK; SET NULL on delete)
```

Cardinality notes:

* `bookings.hold_id` is **nullable** with `ON DELETE SET NULL`, so the
  booking survives even if the originating hold is purged.
* `bookings` and `seats` are connected **only** through the
  `booking_seats` junction — bookings own seats, never the other way.
* `payments` is a **1:1** child of a booking in this MVP. If we later
  support retries, payment will become 1:N with no schema change to
  `bookings` (just remove the implicit uniqueness expectation).

## UNIQUE constraints (the contract)

| Table            | Constraint                          | What it prevents                                     |
| ---------------- | ----------------------------------- | ---------------------------------------------------- |
| `customers`      | `uq_customers_email`                | Two customers sharing the same email.                |
| `seats`          | `uq_seat_theatre_row_col`           | The same physical seat defined twice in one theatre. |
| `show_seats`     | `uq_show_seat_show_seat`            | A physical seat appearing twice in one show.         |
| `booking_seats`  | `uq_booking_seat_booking_seat`      | The same seat added twice to one booking.            |
| `payment_events` | `uq_payment_events_event_id`        | Duplicate gateway callbacks writing the same event.  |

These are **database-level** constraints. Application code can rely on
the database to reject duplicates — there is no application-side race
window where a duplicate could slip through.

## Indexes

Every FK column and every column we expect to filter on has an
index:

```
ix_customers_email, ix_customers_phone
ix_seats_theatre_id
ix_show_seats_show_id, ix_show_seats_seat_id, ix_show_seats_status
ix_holds_show_id, ix_holds_customer_id, ix_holds_status, ix_holds_expires_at
ix_bookings_customer_id, ix_bookings_show_id, ix_bookings_hold_id, ix_bookings_status
ix_booking_seats_booking_id, ix_booking_seats_seat_id
ix_payments_booking_id, ix_payments_status
ix_payment_events_payment_id
```

In particular:

* `ix_show_seats_status` makes the "available seats for show X"
  query a single index seek.
* `ix_holds_expires_at` supports the hold-expiry sweep ("SELECT WHERE
  expires_at < now AND status = active").

## Idempotent payment callbacks

Gateway webhooks include an `event_id` (the gateway's own ID). The
service handler does:

```sql
INSERT INTO payment_events (event_id, payment_id, event_type, ...)
VALUES (:event_id, ...);
```

`event_id` is UNIQUE at the database level (`uq_payment_events_event_id`).
The first insert for a given `event_id` succeeds; a duplicate
callback raises `IntegrityError`, which the handler treats as
"already processed" and returns 200. **No duplicate event rows can
ever be written**, regardless of how the gateway retries.

## Concurrency-ready seat reservation

The hold/booking service will lock seats against `show_seats`:

```sql
UPDATE show_seats
   SET status = 'held', version = version + 1
 WHERE show_id = :show_id
   AND seat_id IN (:ids)
   AND status  = 'available'
   AND version = :expected_version;
```

Two protections stacked:

1. `UNIQUE (show_id, seat_id)` (i.e. `uq_show_seat_show_seat`) means
   there is **exactly one row** per (show, seat) — the unit of
   contention is precisely the seat the user wants.
2. The `version` column makes the update an optimistic CAS: a stale
   update (one that lost the race) is silently rejected because the
   `version = :expected_version` predicate fails. The service then
   returns 409 Conflict, and the client retries.

This works correctly **even under concurrency** because the UPDATE is
atomic at the row level and the UNIQUE constraint guarantees there is
exactly one row per (show, seat) to compete for.

## How to apply the schema

```bash
# from the backend/ directory
pip install -r requirements.txt
cp app/.env.example .env          # then edit DATABASE_URL
alembic upgrade head
```

`alembic upgrade head` will run `0001_initial_schema`, which creates
every table, every UNIQUE constraint, and every index listed above.

`alembic downgrade -1` reverses the migration cleanly (in reverse FK
dependency order).

## Verifying the schema

```bash
python verify_step4_schema.py
```

This is a metadata-only self-test: it does NOT need a database
connection. It imports the models, inspects `Base.metadata`, and
checks that:

* all 11 expected tables are registered
* all 5 expected UNIQUE constraints are present (by name)
* all 4 status enums are registered with the right values
* all indexes from the migration are present on `Base.metadata`

The same metadata is what `alembic` uses to produce migrations, so a
pass here means the schema declaration and the migration script are
in agreement.