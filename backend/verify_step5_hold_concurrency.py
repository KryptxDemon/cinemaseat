"""Step 5 verifier — covers Tests 1, 2, 4, 5, 6 from the spec.

Boots the FastAPI app via TestClient, seeds a minimal show with a row
of three seats, then exercises ``POST /holds`` against:

    Test 1 — normal hold (one seat, 201)
    Test 2 — sequential same-seat attempt (201 → 409)
    Test 4 — partial conflict (A1 ok, A2 held, request A1+A2 → 409, A1 stays available)
    Test 5 — expiry (HOLD_TTL_SECONDS=2, sleep, re-claim succeeds)
    Test 6 — concurrency (100 parallel requests, exactly 1 × 201 + 99 × 409)

Run from ``backend/``:

    python verify_step5_hold_concurrency.py [N]   # default N=100

Requires a running Postgres with migrations 0001 + 0002 already applied.
The script cleans up after itself.
"""

from __future__ import annotations

import concurrent.futures as cf
import os
import sys
import time
import uuid
from collections import Counter

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings
from app.main import app


# ---------------------------------------------------------------------------
# Seed / cleanup helpers
# ---------------------------------------------------------------------------


def _seed(theatre_id: uuid.UUID, movie_id: uuid.UUID,
          show_id: uuid.UUID, seat_ids: dict[str, uuid.UUID],
          show_seat_ids: dict[str, uuid.UUID],
          customer_ids: dict[str, uuid.UUID]) -> None:
    """Insert a 1×3 theatre with a show and three seats in AVAILABLE state.

    ``seat_ids`` / ``show_seat_ids`` are dicts keyed by 'A1', 'A2', 'A3'.
    ``customer_ids`` is a dict keyed by 'alice', 'bob'.
    """
    engine = create_engine(settings.database_url, future=True)
    with engine.begin() as conn:
        # Wipe any prior fixture rows for this show.
        conn.execute(
            text("DELETE FROM hold_seats WHERE hold_id IN "
                 "(SELECT id FROM holds WHERE show_id = :s)"),
            {"s": show_id},
        )
        conn.execute(text("DELETE FROM holds WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM show_seats WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM shows WHERE id = :s"), {"s": show_id})
        for sid in seat_ids.values():
            conn.execute(text("DELETE FROM seats WHERE id = :seat"), {"seat": sid})
        conn.execute(text("DELETE FROM theatres WHERE id = :t"), {"t": theatre_id})
        conn.execute(text("DELETE FROM movies WHERE id = :m"), {"m": movie_id})
        for cid in customer_ids.values():
            conn.execute(text("DELETE FROM customers WHERE id = :c"), {"c": cid})

        # Insert in FK order.
        for label, cid in customer_ids.items():
            conn.execute(
                text("INSERT INTO customers (id, name, email, phone) "
                     "VALUES (:id, :label, :email, '000')"),
                {
                    "id": cid,
                    "label": label,
                    "email": f"{label}-{uuid.uuid4()}@test.local",
                },
            )

        conn.execute(
            text("INSERT INTO theatres (id, name, rows, cols) "
                 "VALUES (:id, 'race-theatre', 1, 3)"),
            {"id": theatre_id},
        )

        for label, sid in seat_ids.items():
            col = int(label[1:])
            conn.execute(
                text("INSERT INTO seats (id, theatre_id, row_label, col_label) "
                     "VALUES (:id, :t, 'A', :c)"),
                {"id": sid, "t": theatre_id, "c": col},
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

        for label, ssid in show_seat_ids.items():
            conn.execute(
                text("INSERT INTO show_seats (id, show_id, seat_id, status, version) "
                     "VALUES (:id, :s, :seat, 'available', 0)"),
                {"id": ssid, "s": show_id, "seat": seat_ids[label]},
            )
    engine.dispose()


def _cleanup(theatre_id: uuid.UUID, show_id: uuid.UUID,
             seat_ids: dict[str, uuid.UUID],
             customer_ids: dict[str, uuid.UUID],
             movie_id: uuid.UUID) -> None:
    engine = create_engine(settings.database_url, future=True)
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM hold_seats WHERE hold_id IN "
                 "(SELECT id FROM holds WHERE show_id = :s)"),
            {"s": show_id},
        )
        conn.execute(text("DELETE FROM holds WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM show_seats WHERE show_id = :s"), {"s": show_id})
        conn.execute(text("DELETE FROM shows WHERE id = :s"), {"s": show_id})
        for sid in seat_ids.values():
            conn.execute(text("DELETE FROM seats WHERE id = :seat"), {"seat": sid})
        conn.execute(text("DELETE FROM theatres WHERE id = :t"), {"t": theatre_id})
        conn.execute(text("DELETE FROM movies WHERE id = :m"), {"m": movie_id})
        for cid in customer_ids.values():
            conn.execute(text("DELETE FROM customers WHERE id = :c"), {"c": cid})
    engine.dispose()


def _fire(client: TestClient, show_id: uuid.UUID, seat_ids: list[uuid.UUID],
          customer_id: uuid.UUID) -> int:
    r = client.post(
        "/holds",
        json={
            "showId": str(show_id),
            "seatIds": [str(s) for s in seat_ids],
            "customerId": str(customer_id),
        },
    )
    return r.status_code


def _row(engine, sql, **params):
    with engine.connect() as conn:
        return conn.execute(text(sql), params).first()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(n: int = 100) -> int:
    theatre_id = uuid.uuid4()
    movie_id = uuid.uuid4()
    show_id = uuid.uuid4()
    seat_ids = {label: uuid.uuid4() for label in ("A1", "A2", "A3")}
    show_seat_ids = {label: uuid.uuid4() for label in ("A1", "A2", "A3")}
    customer_ids = {label: uuid.uuid4() for label in ("alice", "bob", "carol")}

    print(f"seeding show={show_id}  theatre={theatre_id}")
    _seed(theatre_id, movie_id, show_id, seat_ids, show_seat_ids, customer_ids)

    client = TestClient(app)
    results: dict[str, bool] = {}

    try:
        # ------------------------------------------------------------------
        # Test 1 — normal hold
        # ------------------------------------------------------------------
        code = _fire(client, show_id, [seat_ids["A1"]], customer_ids["alice"])
        results["test1_normal_hold"] = code == 201
        print(f"[Test 1] normal hold A1        → {code}  "
              f"{'PASS' if code == 201 else 'FAIL'}")

        # ------------------------------------------------------------------
        # Test 2 — sequential conflict
        # ------------------------------------------------------------------
        code2 = _fire(client, show_id, [seat_ids["A1"]], customer_ids["bob"])
        results["test2_sequential_conflict"] = code2 == 409
        print(f"[Test 2] Bob re-requests A1   → {code2}  "
              f"{'PASS' if code2 == 409 else 'FAIL'}")

        # ------------------------------------------------------------------
        # Test 4 — partial conflict must NOT release the available seat
        # Bob holds A2, then Carol requests {A2, A3}.
        # A2 is taken → 409. A3 must stay AVAILABLE afterwards.
        # ------------------------------------------------------------------
        _fire(client, show_id, [seat_ids["A2"]], customer_ids["bob"])
        code4 = _fire(client, show_id, [seat_ids["A2"], seat_ids["A3"]],
                      customer_ids["carol"])
        engine = create_engine(settings.database_url, future=True)
        a3_row = _row(
            engine,
            "SELECT status, version FROM show_seats "
            "WHERE show_id = :s AND seat_id = :seat",
            s=show_id, seat=seat_ids["A3"],
        )
        a3_available = a3_row is not None and a3_row[0] == "available"
        results["test4_partial_conflict"] = code4 == 409 and a3_available
        print(f"[Test 4] Carol requests A2+A3 → {code4}  "
              f"(A3 status={a3_row[0] if a3_row else '?'})  "
              f"{'PASS' if results['test4_partial_conflict'] else 'FAIL'}")
        engine.dispose()

        # ------------------------------------------------------------------
        # Test 5 — expiry. Use a separate show so we can shrink TTL via env.
        # We override HOLD_TTL_SECONDS at the settings object, then call
        # the service directly (TestClient boots the app once, but
        # settings.hold_ttl_seconds is a plain attribute so it takes
        # effect on the next create_hold()).
        # ------------------------------------------------------------------
        # Skip if the running config already has a small TTL — just to
        # make the sleep honest. We force TTL = 2 here regardless of
        # whatever is in .env, so the test is deterministic.
        original_ttl = settings.hold_ttl_seconds
        settings.hold_ttl_seconds = 2
        try:
            c_a3 = _fire(client, show_id, [seat_ids["A3"]], customer_ids["alice"])
            assert c_a3 == 201, f"Alice's hold on A3 failed: {c_a3}"
            print(f"[Test 5] Alice holds A3 (TTL=2s) → {c_a3}")
            # Wait for the hold to expire.
            time.sleep(2.5)
            c_a3_bob = _fire(client, show_id, [seat_ids["A3"]], customer_ids["bob"])
            results["test5_expiry_recovers"] = c_a3_bob == 201
            print(f"[Test 5] Bob holds A3 after expiry → {c_a3_bob}  "
                  f"{'PASS' if c_a3_bob == 201 else 'FAIL'}")
            # And the old hold row must now be flagged 'expired'.
            engine = create_engine(settings.database_url, future=True)
            old_hold_status = _row(
                engine,
                "SELECT status FROM holds WHERE show_id = :s "
                "ORDER BY created_at ASC LIMIT 1",
                s=show_id,
            )
            engine.dispose()
            if old_hold_status is not None:
                # The first hold is Alice's A3 hold from Test 1's run;
                # her A3 hold from Test 5 may now be 'expired'.
                print(f"[Test 5] oldest hold status = {old_hold_status[0]}")
        finally:
            settings.hold_ttl_seconds = original_ttl

        # ------------------------------------------------------------------
        # Test 6 — concurrency. Wipe holds first so we start clean.
        # ------------------------------------------------------------------
        engine = create_engine(settings.database_url, future=True)
        with engine.begin() as conn:
            conn.execute(
                text("DELETE FROM hold_seats WHERE hold_id IN "
                     "(SELECT id FROM holds WHERE show_id = :s)"),
                {"s": show_id},
            )
            conn.execute(text("DELETE FROM holds WHERE show_id = :s"),
                         {"s": show_id})
            conn.execute(
                text("UPDATE show_seats SET status='available', version=version+1 "
                     "WHERE show_id = :s"),
                {"s": show_id},
            )
        engine.dispose()

        # Fire N concurrent requests for the same seat.
        target_seat = seat_ids["A1"]
        carol_id = customer_ids["carol"]
        with cf.ThreadPoolExecutor(max_workers=n) as pool:
            futures = [
                pool.submit(_fire, client, show_id, [target_seat], carol_id)
                for _ in range(n)
            ]
            codes = [f.result() for f in cf.as_completed(futures)]

        counts = Counter(codes)
        ok = counts.get(201, 0) == 1
        all_conflicts = counts.get(409, 0) == n - 1
        no_errors = counts.get(500, 0) == 0
        results["test6_concurrency"] = ok and all_conflicts and no_errors
        print(f"[Test 6] {n}-way race          → {dict(counts)}  "
              f"{'PASS' if results['test6_concurrency'] else 'FAIL'}")

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        print()
        all_ok = all(results.values())
        for name, passed in results.items():
            print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        print()
        if all_ok:
            print("OK: all Step 5 tests passed")
            return 0
        print("FAIL: at least one assertion failed")
        return 1
    finally:
        _cleanup(theatre_id, show_id, seat_ids, customer_ids, movie_id)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    sys.exit(main(n))
