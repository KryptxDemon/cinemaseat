-- =============================================================================
-- CinemaSeat — full seed: theatres + seats + shows + show_seats
-- =============================================================================
-- The SPA's ShowtimesPage calls GET /shows; without rows it falls back to
-- mock data and the rest of the booking flow (holds -> payments) never
-- reaches the backend. This script reseeds the catalogue end-to-end:
--   1. Wipes dependent booking/hold/payment rows + shows/seats/theatres.
--   2. Creates 4 named theatres (5x6 grid each = 30 seats per theatre).
--   3. Creates 1 show per (movie, theatre) for today + tomorrow at 14:00 UTC,
--      so the catalogue has 5 movies x 4 theatres x 2 days = 40 shows.
--   4. Populates show_seats for every (show, seat) pair (status=available).
--
-- Safe to re-run: TRUNCATEs child rows first with CASCADE.
-- =============================================================================

BEGIN;

-- Reset dependent booking data so we can re-seed cleanly.
TRUNCATE TABLE
    payment_events,
    payments,
    hold_seats,
    bookings,
    booking_seats,
    holds,
    show_seats,
    shows,
    seats,
    theatres
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- Theatres (4 halls)
-- -----------------------------------------------------------------------------
INSERT INTO theatres (id, name, rows, cols, created_at) VALUES
    ('b80fee88-7fb6-498d-9dca-b18201c7c8c3', 'Cineplex IMAX',   5, 6, now()),
    ('e89af482-9381-4955-96d2-f5c9a9824538', 'Galaxy Screen 1', 5, 6, now()),
    ('6a83aa8d-9173-4f7d-8654-7772f8ec05cd', 'Starlight Dolby', 5, 6, now()),
    ('79228a8c-bfd5-4296-b322-eb291d4247f5', 'Premiere 4DX',    5, 6, now());

-- -----------------------------------------------------------------------------
-- Seats: 5 rows (A..E) x 6 cols per theatre = 30 seats per theatre (120 total)
-- -----------------------------------------------------------------------------
WITH theatre_ids AS (
    SELECT id FROM theatres
),
seat_grid AS (
    SELECT t.id AS theatre_id,
           r.row_label,
           c.col_label
      FROM theatre_ids t
     CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E')) AS r(row_label)
     CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS c(col_label)
)
INSERT INTO seats (id, theatre_id, row_label, col_label, created_at)
SELECT gen_random_uuid(),
       theatre_id,
       row_label,
       col_label,
       now()
  FROM seat_grid;

-- -----------------------------------------------------------------------------
-- Shows: 1 per (movie, theatre) for today + tomorrow at 14:00 UTC.
-- 5 movies x 4 theatres x 2 days = 40 shows. base_price = 12.50 USD.
-- -----------------------------------------------------------------------------
WITH movie_ids AS (
    SELECT id FROM movies
),
theatre_ids AS (
    SELECT id FROM theatres
),
day_offsets AS (
    SELECT generate_series(0, 1) AS day_offset
)
INSERT INTO shows (id, movie_id, theatre_id, start_time, base_price, created_at)
SELECT gen_random_uuid(),
       m.id,
       t.id,
       -- 14:00 UTC, today + day_offset
       (date_trunc('day', now()) AT TIME ZONE 'UTC'
        + interval '14 hours'
        + (d.day_offset || ' days')::interval) AT TIME ZONE 'UTC',
       12.50,
       now()
  FROM movie_ids m
 CROSS JOIN theatre_ids t
 CROSS JOIN day_offsets d;

-- -----------------------------------------------------------------------------
-- show_seats: every (show, seat-in-that-theatre) pair, status='available'
-- 40 shows x 30 seats = 1200 rows
-- -----------------------------------------------------------------------------
INSERT INTO show_seats (id, show_id, seat_id, status, version, created_at, updated_at)
SELECT gen_random_uuid(),
       sh.id,
       st.id,
       'available',
       0,
       now(),
       now()
  FROM shows sh
  JOIN theatres t   ON t.id = sh.theatre_id
  JOIN seats    st  ON st.theatre_id = t.id;

-- Sanity report
SELECT
    (SELECT count(*) FROM movies)     AS movies,
    (SELECT count(*) FROM theatres)   AS theatres,
    (SELECT count(*) FROM seats)      AS seats,
    (SELECT count(*) FROM shows)      AS shows,
    (SELECT count(*) FROM show_seats) AS show_seats;

COMMIT;