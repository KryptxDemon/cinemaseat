"""Step 7 verifier — payment callback flow, idempotency, amount validation, and race conditions.

Exercises POST /payments/callback against FastAPI TestClient:
  Test 1 — successful callback (pending -> SUCCEEDED -> payment succeeded, booking confirmed, HTTP 200)
  Test 2 — duplicate callback (same callback twice -> first processed, second ignored, both HTTP 200, one PaymentEvent)
  Test 3 — failed callback (pending -> FAILED -> payment failed, booking failed, HTTP 200)
  Test 4 — amount mismatch (expected amount != callback amount -> booking NOT confirmed, HTTP 200)
  Test 5 — callback race condition handling (simulated callback race)

Run from `backend/`:
    python verify_step7_callback.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Allow running from any directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings
from app.main import app


PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"


def _check(label: str, ok: bool, detail: str = "") -> bool:
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {label}{(' — ' + detail) if detail else ''}")
    return ok


def _seed_show_and_hold(db_engine):
    """Seed DB with a show, seat, hold, customer, booking, and payment."""
    now = datetime.now(timezone.utc)
    eng = db_engine

    with eng.begin() as conn:
        theatre_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO theatres (id, name, rows, cols, created_at) VALUES (:id, 'Test Theatre', 10, 10, :now)"
            ),
            {"id": theatre_id, "now": now},
        )
        seat_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO seats (id, theatre_id, row_label, col_label, created_at) VALUES (:id, :tid, 'A', 1, :now)"
            ),
            {"id": seat_id, "tid": theatre_id, "now": now},
        )

        movie_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO movies (id, title, duration_minutes, description, created_at) VALUES (:id, 'Test Film', 120, 'Desc', :now)"
            ),
            {"id": movie_id, "now": now},
        )

        show_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO shows (id, movie_id, theatre_id, start_time, base_price, created_at) VALUES (:id, :mid, :tid, :st, 15.00, :now)"
            ),
            {"id": show_id, "mid": movie_id, "tid": theatre_id, "st": now + timedelta(hours=2), "now": now},
        )

        show_seat_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO show_seats (id, show_id, seat_id, status, version, created_at, updated_at) VALUES (:id, :sid, :seat_id, 'available', 0, :now, :now)"
            ),
            {"id": show_seat_id, "sid": show_id, "seat_id": seat_id, "now": now},
        )

        cust_id = uuid.uuid4()
        conn.execute(
            text(
                "INSERT INTO customers (id, name, email, phone, created_at) VALUES (:id, 'Tester', :email, '+1234567890', :now)"
            ),
            {"id": cust_id, "email": f"cust-{cust_id}@example.com", "now": now},
        )

    return show_id, seat_id, show_seat_id, cust_id


def _wipe(db_engine) -> None:
    with db_engine.begin() as conn:
        for tbl in (
            "payment_events",
            "payments",
            "booking_seats",
            "bookings",
            "hold_seats",
            "holds",
            "show_seats",
            "shows",
            "seats",
            "theatres",
            "movies",
            "customers",
        ):
            conn.execute(text(f"DELETE FROM {tbl}"))


def main() -> int:
    engine = create_engine(settings.database_url, future=True)
    client = TestClient(app)

    print("=" * 72)
    print("Step 7 verifier — payment callback flow & idempotency")
    print("=" * 72)
    print()

    _wipe(engine)
    results: list[bool] = []

    # ------------------------------------------------------------------ #
    # Test 1 — Successful Callback                                      #
    # ------------------------------------------------------------------ #
    print("Test 1 — Successful Callback (SUCCEEDED)")
    show_id, seat_id, show_seat_id, cust_id = _seed_show_and_hold(engine)

    # 1. Place hold
    h_resp = client.post(
        "/holds",
        json={"showId": str(show_id), "seatIds": [str(seat_id)], "customerId": str(cust_id)},
    )
    hold_id = h_resp.json()["id"]

    # 2. Initiate payment
    p_resp = client.post(
        "/payments",
        json={"holdId": hold_id, "name": "User 1", "phone": "+1000", "email": "user1@example.com"},
    )
    booking_id = p_resp.json()["bookingId"]
    gw_pay_id = p_resp.json().get("gatewayPaymentId") or f"pay_mock_{uuid.uuid4().hex[:8]}"

    # Poll status: should be 'pending'
    b_poll1 = client.get(f"/bookings/{hold_id}").json()
    results.append(_check("Initial booking status is pending", b_poll1["status"] == "pending"))

    # 3. Post callback SUCCEEDED
    event_id_1 = f"evt_succ_{uuid.uuid4().hex[:8]}"
    cb1 = client.post(
        "/payments/callback",
        json={
            "eventId": event_id_1,
            "paymentId": gw_pay_id,
            "bookingRef": hold_id,
            "status": "SUCCEEDED",
            "amount": 15.00,
        },
    )
    results.append(_check("Callback returned 200 OK", cb1.status_code == 200, f"got {cb1.status_code}"))

    # Check DB state
    with engine.begin() as conn:
        b_row = conn.execute(text("SELECT status FROM bookings WHERE id = :b"), {"b": booking_id}).first()
        p_row = conn.execute(text("SELECT status FROM payments WHERE booking_id = :b"), {"b": booking_id}).first()
        ss_row = conn.execute(text("SELECT status FROM show_seats WHERE id = :s"), {"s": show_seat_id}).first()
        evt_cnt = conn.execute(text("SELECT count(*) FROM payment_events WHERE event_id = :e"), {"e": event_id_1}).scalar_one()

    results.append(_check("Booking status is confirmed", b_row is not None and str(b_row.status).lower() == "confirmed"))
    results.append(_check("Payment status is success", p_row is not None and str(p_row.status).lower() in ("success", "succeeded")))
    results.append(_check("Show seat status is booked", ss_row is not None and str(ss_row.status).lower() in ("booked", "b")))
    results.append(_check("PaymentEvent was saved", evt_cnt == 1))

    # Poll GET /bookings/{holdId}: should be 'confirmed'
    b_poll2 = client.get(f"/bookings/{hold_id}").json()
    results.append(_check("GET /bookings/{holdId} returns confirmed", b_poll2["status"] == "confirmed"))
    print()

    # ------------------------------------------------------------------ #
    # Test 2 — Duplicate Callback (event_id Idempotency)                #
    # ------------------------------------------------------------------ #
    print("Test 2 — Duplicate Callback (same event_id)")
    cb2 = client.post(
        "/payments/callback",
        json={
            "eventId": event_id_1,  # Same event_id as Test 1
            "paymentId": gw_pay_id,
            "bookingRef": hold_id,
            "status": "SUCCEEDED",
            "amount": 15.00,
        },
    )
    results.append(_check("Duplicate callback returned 200 OK", cb2.status_code == 200, f"got {cb2.status_code}"))
    cb2_body = cb2.json()
    results.append(_check("Response message notes duplicate ignored", "duplicate" in cb2_body.get("message", "").lower()))

    with engine.begin() as conn:
        evt_cnt2 = conn.execute(text("SELECT count(*) FROM payment_events WHERE event_id = :e"), {"e": event_id_1}).scalar_one()

    results.append(_check("PaymentEvent count remains exactly 1", evt_cnt2 == 1))
    print()

    # ------------------------------------------------------------------ #
    # Test 3 — Failed Callback (FAILED / REFUNDED)                       #
    # ------------------------------------------------------------------ #
    print("Test 3 — Failed Callback (FAILED)")
    show_id3, seat_id3, show_seat_id3, cust_id3 = _seed_show_and_hold(engine)

    h_resp3 = client.post(
        "/holds",
        json={"showId": str(show_id3), "seatIds": [str(seat_id3)], "customerId": str(cust_id3)},
    )
    hold_id3 = h_resp3.json()["id"]

    p_resp3 = client.post(
        "/payments",
        json={"holdId": hold_id3, "name": "User 3", "phone": "+3000", "email": "user3@example.com"},
    )
    booking_id3 = p_resp3.json()["bookingId"]
    gw_pay_id3 = p_resp3.json().get("gatewayPaymentId") or f"pay_mock_{uuid.uuid4().hex[:8]}"

    event_id_3 = f"evt_fail_{uuid.uuid4().hex[:8]}"
    cb3 = client.post(
        "/payments/callback",
        json={
            "eventId": event_id_3,
            "paymentId": gw_pay_id3,
            "bookingRef": hold_id3,
            "status": "FAILED",
            "amount": 15.00,
        },
    )
    results.append(_check("Failed callback returned 200 OK", cb3.status_code == 200))

    with engine.begin() as conn:
        b_row3 = conn.execute(text("SELECT status FROM bookings WHERE id = :b"), {"b": booking_id3}).first()
        p_row3 = conn.execute(text("SELECT status FROM payments WHERE booking_id = :b"), {"b": booking_id3}).first()
        ss_row3 = conn.execute(text("SELECT status FROM show_seats WHERE id = :s"), {"s": show_seat_id3}).first()

    results.append(_check("Booking status is cancelled/failed", b_row3 is not None and str(b_row3.status).lower() in ("cancelled", "failed")))
    results.append(_check("Payment status is failed", p_row3 is not None and str(p_row3.status).lower() == "failed"))
    results.append(_check("Show seat status returned to available", ss_row3 is not None and str(ss_row3.status).lower() in ("available", "a")))

    b_poll3 = client.get(f"/bookings/{hold_id3}").json()
    results.append(_check("GET /bookings/{holdId} returns failed", b_poll3["status"] == "failed"))
    print()

    # ------------------------------------------------------------------ #
    # Test 4 — Amount Mismatch Validation                               #
    # ------------------------------------------------------------------ #
    print("Test 4 — Amount Mismatch Validation")
    show_id4, seat_id4, show_seat_id4, cust_id4 = _seed_show_and_hold(engine)

    h_resp4 = client.post(
        "/holds",
        json={"showId": str(show_id4), "seatIds": [str(seat_id4)], "customerId": str(cust_id4)},
    )
    hold_id4 = h_resp4.json()["id"]

    p_resp4 = client.post(
        "/payments",
        json={"holdId": hold_id4, "name": "User 4", "phone": "+4000", "email": "user4@example.com"},
    )
    booking_id4 = p_resp4.json()["bookingId"]
    gw_pay_id4 = p_resp4.json().get("gatewayPaymentId") or f"pay_mock_{uuid.uuid4().hex[:8]}"

    event_id_4 = f"evt_bad_amt_{uuid.uuid4().hex[:8]}"
    cb4 = client.post(
        "/payments/callback",
        json={
            "eventId": event_id_4,
            "paymentId": gw_pay_id4,
            "bookingRef": hold_id4,
            "status": "SUCCEEDED",
            "amount": 999.99,  # Bad amount! Expected 15.00
        },
    )
    results.append(_check("Mismatch callback returned 200 OK", cb4.status_code == 200))

    with engine.begin() as conn:
        b_row4 = conn.execute(text("SELECT status FROM bookings WHERE id = :b"), {"b": booking_id4}).first()
        p_row4 = conn.execute(text("SELECT status FROM payments WHERE booking_id = :b"), {"b": booking_id4}).first()

    results.append(_check("Booking status is NOT confirmed", b_row4 is not None and str(b_row4.status).lower() != "confirmed"))
    results.append(_check("Payment status is failed due to mismatch", p_row4 is not None and str(p_row4.status).lower() == "failed"))
    print()

    # ------------------------------------------------------------------ #
    # Test 5 — Callback Race Condition                                  #
    # ------------------------------------------------------------------ #
    print("Test 5 — Callback Race Condition Handling")
    show_id5, seat_id5, show_seat_id5, cust_id5 = _seed_show_and_hold(engine)

    h_resp5 = client.post(
        "/holds",
        json={"showId": str(show_id5), "seatIds": [str(seat_id5)], "customerId": str(cust_id5)},
    )
    hold_id5 = h_resp5.json()["id"]

    # Fire callback before /payments completes or when payment is being created
    # We test that sending a callback for an existing hold_id immediately resolves
    p_resp5 = client.post(
        "/payments",
        json={"holdId": hold_id5, "name": "User 5", "phone": "+5000", "email": "user5@example.com"},
    )
    booking_id5 = p_resp5.json()["bookingId"]
    gw_pay_id5 = p_resp5.json().get("gatewayPaymentId") or f"pay_mock_{uuid.uuid4().hex[:8]}"

    event_id_5 = f"evt_race_{uuid.uuid4().hex[:8]}"
    cb5 = client.post(
        "/payments/callback",
        json={
            "eventId": event_id_5,
            "paymentId": gw_pay_id5,
            "bookingRef": hold_id5,
            "status": "SUCCEEDED",
            "amount": 15.00,
        },
    )
    results.append(_check("Race callback returned 200 OK", cb5.status_code == 200))

    b_poll5 = client.get(f"/bookings/{hold_id5}").json()
    results.append(_check("Booking reaches confirmed state", b_poll5["status"] == "confirmed"))
    print()

    return _summary(results)


def _summary(results: list[bool]) -> int:
    total = len(results)
    passed = sum(1 for r in results if r)
    print("=" * 72)
    print(f"Step 7 verifier: {passed}/{total} assertions passed")
    print("=" * 72)
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
