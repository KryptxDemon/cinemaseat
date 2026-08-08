"""Verify Step 5 — the 100-way race for one seat.

Boots the FastAPI app via TestClient, seeds a minimal show with one
seat, then fires N concurrent ``POST /holds`` requests for the same
seat. Asserts:

    exactly 1 request returned  201 (the winner)
    exactly N-1 returned        409 (the losers)
    no request returned         500
    show_seats.status is now    'held' (the single winner)
    the (show, seat) pair has exactly one hold + one hold_seat row

Run from the ``backend/`` directory:

    python verify_step5_hold_concurrency.py [N]   # default N=100

Requires ``DATABASE_URL`` to point to a real Postgres with the
0001 + 0002 migrations already applied. The script cleans up after
itself — rows created by this run are deleted in the final step.
"""

from __future__ import annotations

import concurrent.futures as cf
import os
import sys
import uuid
from collections import Counter

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings
from app.main import app


def _seed(show_id: uuid.UUID, theatre_id: uuid.UUID, seat_id: uuid.UUID,
          show_seat_id: uuid.UUID, customer_id: uuid.UUID, movie_id: uuid.UUID) -> None:
    """Insert a minimal show with one (show_seat) row, in AVAILABLE state."""
    engine = create_engine(settings.database_url, future=True)
    with engine.begin() as conn:
        # Idempotent seed: delete any prior fixture rows first.
        conn.execute(
            text("DELETE FROM hold_seats WHERE hold_id IN (SELECT id FROM holds WHERE show_id = :s)"),
            {"s": show_id},
        )
        conn.execute(text("DELETE FROM holds WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM show_seats WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM shows WHERE id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM seats WHERE id = :seat"), {"seat": seat_id})
        conn.execute(text("DELETE FROM theatres WHERE id = :t"), {"t": theatre_id})
        conn.execute(text("DELETE FROM movies WHERE id = :m"), {"m": movie_id})
        conn.execute(text("DELETE FROM customers WHERE id = :c"), {"c": customer_id})

        # Now insert in FK order.
        conn.execute(
            text("INSERT INTO customers (id, name, email, phone) VALUES (:id, 'race', :email, '000')"),
            {"id": customer_id, "email": f"race-{uuid.uuid4()}@test.local"},
        )
        conn.execute(
            text("INSERT INTO theatres (id, name, rows, cols) VALUES (:id, 'r', 1, 1)"),
            {"id": theatre_id},
        )
        conn.execute(
            text("INSERT INTO seats (id, theatre_id, row_label, col_label) VALUES (:id, :t, 'A', 1)"),
            {"id": seat_id, "t": theatre_id},
        )
        conn.execute(
            text("INSERT INTO movies (id, title, duration_minutes) "
                 "VALUES (:id, 'race', 100)"),
            {"id": movie_id},
        )
        conn.execute(
            text("INSERT INTO shows (id, movie_id, theatre_id, start_time, base_price) "
                 "VALUES (:id, :m, :t, now() + interval '1 day', 10.00)"),
            {"id": show_id, "m": movie_id, "t": theatre_id},
        )
        conn.execute(
            text("INSERT INTO show_seats (id, show_id, seat_id, status, version) "
                 "VALUES (:id, :s, :seat, 'available', 0)"),
            {"id": show_seat_id, "s": show_id, "seat": seat_id},
        )
    engine.dispose()


def _cleanup(show_id: uuid.UUID, theatre_id: uuid.UUID, seat_id: uuid.UUID,
             customer_id: uuid.UUID, movie_id: uuid.UUID) -> None:
    engine = create_engine(settings.database_url, future=True)
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM hold_seats WHERE hold_id IN (SELECT id FROM holds WHERE show_id = :s)"),
            {"s": show_id},
        )
        conn.execute(text("DELETE FROM holds WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM show_seats WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM shows WHERE id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM seats WHERE id = :seat"), {"seat": seat_id})
        conn.execute(text("DELETE FROM theatres WHERE id = :t"), {"t": theatre_id})
        conn.execute(text("DELETE FROM movies WHERE id = :m"), {"m": movie_id})
        conn.execute(text("DELETE FROM customers WHERE id = :c"), {"c": customer_id})
    engine.dispose()


def _fire(client: TestClient, show_id: uuid.UUID, seat_id: uuid.UUID,
          customer_id: uuid.UUID) -> int:
    r = client.post(
        "/holds",
        json={
            "showId": str(show_id),
            "seatIds": [str(seat_id)],
            "customerId": str(customer_id),
        },
    )
    return r.status_code


def main(n: int = 100) -> int:
    show_id = uuid.uuid4()
    theatre_id = uuid.uuid4()
    seat_id = uuid.uuid4()
    show_seat_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    movie_id = uuid.uuid4()

    print(f"seeding show={show_id} seat={seat_id}")
    _seed(show_id, theatre_id, seat_id, show_seat_id, customer_id, movie_id)

    client = TestClient(app)
    try:
        print(f"firing {n} concurrent POST /holds for the same seat ...")
        with cf.ThreadPoolExecutor(max_workers=n) as pool:
            futures = [
                pool.submit(_fire, client, show_id, seat_id, customer_id)
                for _ in range(n)
            ]
            codes = [f.result() for f in cf.as_completed(futures)]

        counts = Counter(codes)
        print(f"status codes: {dict(counts)}")

        ok = counts.get(201, 0) == 1
        all_conflicts = counts.get(409, 0) == n - 1
        no_errors = counts.get(500, 0) == 0

        # --- DB-level assertions ---
        engine = create_engine(settings.database_url, future=True)
        with engine.connect() as conn:
            ss_status = conn.execute(
                text("SELECT status, version FROM show_seats WHERE show_id = :s"),
                {"s": show_id},
            ).first()
            hold_count = conn.execute(
                text("SELECT count(*) FROM holds WHERE show_id = :s"),
                {"s": show_id},
            ).scalar_one()
            hold_seat_count = conn.execute(
                text("SELECT count(*) FROM hold_seats WHERE hold_id IN (SELECT id FROM holds WHERE show_id = :s)"),
                {"s": show_id},
            ).scalar_one()
        engine.dispose()

        print(f"  show_seats.status = {ss_status[0]}  (version = {ss_status[1]})")
        print(f"  holds rows         = {hold_count}")
        print(f"  hold_seats rows    = {hold_seat_count}")

        flags = {
            "exactly 1 success": ok,
            "99 conflicts": all_conflicts,
            "no 500s": no_errors,
            "show_seats status == 'held'": ss_status[0] == "held",
            "show_seats version == 1": ss_status[1] == 1,
            "exactly 1 hold row": hold_count == 1,
            "exactly 1 hold_seat row": hold_seat_count == 1,
        }
        for k, v in flags.items():
            print(f"  [{'PASS' if v else 'FAIL'}] {k}")

        if all(flags.values()):
            print("\nOK: 100-way race resolved correctly")
            return 0
        print("\nFAIL: at least one assertion failed")
        return 1
    finally:
        _cleanup(show_id, theatre_id, seat_id, customer_id, movie_id)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    sys.exit(main(n))
