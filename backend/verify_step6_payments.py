"""Step 6 verifier — end-to-end payment flow.

Boots the FastAPI app via TestClient (in-process), seeds a minimal
show with one available seat, then exercises ``POST /payments``:

  Test 1 — normal POST /payments against an active hold (202 pending)
  Test 2 — POST /payments for an unknown hold_id   (404)
  Test 3 — POST /payments after the hold has expired (409)
  Test 4 — POST /payments twice for the same hold   (second call 409)
  Test 5 — GET /bookings/{holdId} returns the booking just created
  Test 6 — POST /payments with malformed email        (422)
  Test 7 — gateway was actually called: a ``payment_id`` exists in
           our ``payments.gateway_reference`` column AND the gateway
           records the booking_ref via ``GET /debug/payments``.

Run from ``backend/``::

    python verify_step6_payments.py

Requires a running Postgres with migrations 0001 + 0002 already
applied, AND the mock-gateway container reachable at
``settings.mock_gateway_url``.

When this verifier is run from INSIDE the backend Docker container
the gateway is at ``http://cinemaseat-gateway-1:9000`` (default).
When run on the host, override with ``MOCK_GATEWAY_URL=http://localhost:8080``.
"""

from __future__ import annotations

import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

# Allow `python verify_step6_payments.py` from any CWD.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings
from app.database import Base
from app.main import app
from app.models import (  # noqa: E402  (after sys.path tweak)
    Booking,
    BookingSeat,
    Customer,
    Hold,
    HoldSeat,
    Payment,
    PaymentEvent,
    PaymentStatus,
    Show,
    ShowSeat,
    ShowSeatStatus,
)
import httpx  # for the gateway debug probe


# ---------------------------------------------------------------------------
# Mini assertion helpers
# ---------------------------------------------------------------------------

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"


def _check(label: str, ok: bool, detail: str = "") -> bool:
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {label}{(' — ' + detail) if detail else ''}")
    return ok


# ---------------------------------------------------------------------------
# Seed / cleanup helpers
# ---------------------------------------------------------------------------


def _seed_show(db_engine, *, seat_count: int = 1, hold_ttl_seconds: int = 120):
    """Create a movie, theatre, show, and N available show_seats.

    Returns (show_id, seat_ids, customer_id).
    """
    eng = db_engine
    now = datetime.now(timezone.utc)

    with eng.begin() as conn:
        # Theatre + 3 seats (rows A1, A2, A3).
        theatre_id = uuid.uuid4()
        conn.execute(
            text(
                """
                INSERT INTO theatres (id, name, address, created_at)
                VALUES (:id, 'Verifier Theatre', '1 Demo St', :now)
                """
            ),
            {"id": theatre_id, "now": now},
        )
        seat_ids = [uuid.uuid4() for _ in range(max(seat_count, 3))]
        for sid in seat_ids:
            conn.execute(
                text(
                    """
                    INSERT INTO seats (id, theatre_id, row_label, col_label, created_at)
                    VALUES (:id, :tid, 'A', :col, :now)
                    """
                ),
                {"id": sid, "tid": theatre_id, "col": seat_ids.index(sid) + 1, "now": now},
            )

        movie_id = uuid.uuid4()
        conn.execute(
            text(
                """
                INSERT INTO movies (id, title, duration_minutes, rating, created_at)
                VALUES (:id, 'Verifier Movie', 120, 'PG', :now)
                """
            ),
            {"id": movie_id, "now": now},
        )

        show_id = uuid.uuid4()
        conn.execute(
            text(
                """
                INSERT INTO shows (id, movie_id, theatre_id, start_time, base_price, created_at)
                VALUES (:id, :mid, :tid, :st, 12.50, :now)
                """
            ),
            {"id": show_id, "mid": movie_id, "tid": theatre_id,
             "st": now + timedelta(hours=3), "now": now},
        )

        # Show_seats — only `seat_count` are AVAILABLE, the rest are
        # BOOKED so they cannot be requested.
        for i, sid in enumerate(seat_ids):
            status = "available" if i < seat_count else "booked"
            conn.execute(
                text(
                    """
                    INSERT INTO show_seats (id, show_id, seat_id, status, version, created_at, updated_at)
                    VALUES (:id, :sid, :seat_id, :status, 0, :now, :now)
                    """
                ),
                {"id": uuid.uuid4(), "sid": show_id, "seat_id": sid, "status": status, "now": now},
            )

        # A throwaway customer to satisfy holds.customer_id.
        cust_id = uuid.uuid4()
        conn.execute(
            text(
                """
                INSERT INTO customers (id, name, email, phone, created_at)
                VALUES (:id, 'Hold Owner', 'hold-owner@example.com', '+10000000000', :now)
                """
            ),
            {"id": cust_id, "now": now},
        )

    return show_id, seat_ids[:seat_count], cust_id


def _wipe(db_engine) -> None:
    """Best-effort cleanup of any rows this verifier created.

    We delete in FK-safe order. Customers / theatres / movies are
    cleaned too so the verifier is repeatable.
    """
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
        ):
            conn.execute(text(f"DELETE FROM {tbl}"))


# ---------------------------------------------------------------------------
# Gateway helper
# ---------------------------------------------------------------------------


def _gateway_seen(booking_ref: str) -> bool | str:
    """Return True if the gateway has a payment matching booking_ref.

    Uses the gateway's debug endpoint so we don't have to inspect
    in-memory state. Returns the payment_id on success, False on miss.
    """
    base = settings.mock_gateway_url.rstrip("/")
    url = f"{base}/debug/payments"
    try:
        r = httpx.get(url, timeout=5.0)
        r.raise_for_status()
    except httpx.HTTPError as exc:
        return f"gateway debug probe failed: {exc}"
    for entry in r.json():
        if entry.get("booking_ref") == booking_ref:
            return entry.get("payment_id")
    return False


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def main() -> int:
    engine = create_engine(settings.database_url, future=True)

    print("=" * 72)
    print("Step 6 verifier — payment flow")
    print("=" * 72)
    print(f"  gateway    : {settings.mock_gateway_url}")
    print(f"  gateway cb : {settings.mock_gateway_callback_url}")
    print(f"  database   : {settings.database_url.split('@')[-1]}")
    print(f"  gateway mode: {settings.mock_gateway_mode or '(random/ch chaos)'}")
    print()

    _wipe(engine)
    show_id, seat_ids, hold_owner_id = _seed_show(engine, seat_count=3)
    client = TestClient(app)

    results: list[bool] = []

    # ------------------------------------------------------------------ #
    # Test 1 — POST /payments for an active hold                        #
    # ------------------------------------------------------------------ #
    print("Test 1 — POST /payments against an active hold")
    hold_resp = client.post(
        "/holds",
        json={"showId": str(show_id), "seatIds": [str(s) for s in seat_ids[:1]],
              "customerId": str(hold_owner_id)},
    )
    if not _check("POST /holds returned 201", hold_resp.status_code == 201,
                  f"got {hold_resp.status_code} body={hold_resp.text[:200]}"):
        results.append(False); return _summary(results)
    hold_id = hold_resp.json()["id"]

    pay_resp = client.post(
        "/payments",
        json={"holdId": hold_id, "name": "Alice Tester",
              "phone": "+15555550101", "email": "Alice@Example.com"},
    )
    ok = pay_resp.status_code == 202
    body = pay_resp.json() if pay_resp.headers.get("content-type", "").startswith("application/json") else {}
    results.append(_check("POST /payments returned 202", ok, f"got {pay_resp.status_code} body={pay_resp.text[:200]}"))
    results.append(_check("response.status == 'pending'", body.get("status") == "pending",
                          f"got {body.get('status')!r}"))
    results.append(_check("response.holdId echoes the hold", body.get("holdId") == hold_id))
    results.append(_check("response.bookingId is a uuid", isinstance(body.get("bookingId"), str) and len(body["bookingId"]) == 36))
    results.append(_check("response.amount equals hold total", abs(body.get("amount", -1) - 12.50) < 1e-6,
                          f"got {body.get('amount')!r}"))
    results.append(_check("gateway_payment_id was captured", bool(body.get("gatewayPaymentId")),
                          f"got {body.get('gatewayPaymentId')!r}"))

    booking_id = body.get("bookingId")
    gateway_payment_id = body.get("gatewayPaymentId")
    print(f"  booking={booking_id} gateway_pay={gateway_payment_id}")

    # --- DB invariants for the happy path -----------------------------
    with engine.begin() as conn:
        booking_row = conn.execute(
            text("SELECT status, hold_id, customer_id, total_amount FROM bookings WHERE id = :b"),
            {"b": booking_id},
        ).first()
        payment_row = conn.execute(
            text("SELECT status, gateway_reference FROM payments WHERE booking_id = :b"),
            {"b": booking_id},
        ).first()
        hold_row = conn.execute(
            text("SELECT status FROM holds WHERE id = :h"), {"h": hold_id}
        ).first()
        booking_seats_count = conn.execute(
            text("SELECT count(*) FROM booking_seats WHERE booking_id = :b"),
            {"b": booking_id},
        ).scalar_one()
        customer_row = conn.execute(
            text("SELECT email FROM customers WHERE id = (SELECT customer_id FROM bookings WHERE id = :b)"),
            {"b": booking_id},
        ).first()

    results.append(_check("booking row exists", booking_row is not None))
    results.append(_check(
        "booking.status == 'pending'",
        booking_row is not None and booking_row.status == "pending",
        f"got {booking_row.status if booking_row else None!r}",
    ))
    results.append(_check(
        "booking.hold_id points back at the hold",
        booking_row is not None and str(booking_row.hold_id) == hold_id,
    ))
    results.append(_check(
        "payment.status == 'pending'",
        payment_row is not None and payment_row.status == "pending",
        f"got {payment_row.status if payment_row else None!r}",
    ))
    results.append(_check(
        "payment.gateway_reference is set",
        payment_row is not None and bool(payment_row.gateway_reference),
        f"got {payment_row.gateway_reference if payment_row else None!r}",
    ))
    results.append(_check(
        "hold.status flipped to 'converted'",
        hold_row is not None and hold_row.status == "converted",
        f"got {hold_row.status if hold_row else None!r}",
    ))
    results.append(_check(
        "booking_seats has 1 row",
        booking_seats_count == 1,
        f"got {booking_seats_count}",
    ))
    results.append(_check(
        "customer was created with lowercased email",
        customer_row is not None and customer_row.email == "alice@example.com",
        f"got {customer_row.email if customer_row else None!r}",
    ))

    # Gateway state — confirm the gateway actually saw this charge.
    gw_match = _gateway_seen(hold_id)
    results.append(_check(
        "gateway /debug/payments records our booking_ref",
        gw_match is not False and not isinstance(gw_match, str),
        f"got {gw_match!r}",
    ))
    if isinstance(gw_match, str):
        results.append(_check(
            "gateway payment_id matches what we stored",
            gw_match == gateway_payment_id,
            f"debug={gw_match!r} stored={gateway_payment_id!r}",
        ))
    print()

    # ------------------------------------------------------------------ #
    # Test 2 — POST /payments for an unknown hold_id                    #
    # ------------------------------------------------------------------ #
    print("Test 2 — POST /payments for an unknown hold_id")
    ghost_id = str(uuid.uuid4())
    r = client.post(
        "/payments",
        json={"holdId": ghost_id, "name": "Bob", "phone": "+15555550202", "email": "bob@example.com"},
    )
    results.append(_check("404 Not Found", r.status_code == 404, f"got {r.status_code} body={r.text[:200]}"))
    print()

    # ------------------------------------------------------------------ #
    # Test 3 — POST /payments for an expired hold                       #
    # ------------------------------------------------------------------ #
    print("Test 3 — POST /payments for an expired hold")
    # Make a fresh hold, then forcibly age it.
    fresh = client.post(
        "/holds",
        json={"showId": str(show_id), "seatIds": [str(seat_ids[1])],
              "customerId": str(hold_owner_id)},
    )
    if not _check("seed: POST /holds returned 201", fresh.status_code == 201,
                  f"got {fresh.status_code} body={fresh.text[:200]}"):
        results.append(False); return _summary(results)
    expired_hold_id = fresh.json()["id"]

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE holds SET expires_at = now() - interval '1 second' WHERE id = :h"),
            {"h": expired_hold_id},
        )

    r = client.post(
        "/payments",
        json={"holdId": expired_hold_id, "name": "Carol", "phone": "+15555550303",
              "email": "carol@example.com"},
    )
    results.append(_check("409 Conflict", r.status_code == 409, f"got {r.status_code} body={r.text[:200]}"))
    print()

    # ------------------------------------------------------------------ #
    # Test 4 — POST /payments twice for the same hold                   #
    # ------------------------------------------------------------------ #
    print("Test 4 — POST /payments twice for the same hold")
    # Re-use the original hold from Test 1 — it's now CONVERTED.
    r2 = client.post(
        "/payments",
        json={"holdId": hold_id, "name": "Alice Again", "phone": "+15555550101",
              "email": "alice@example.com"},
    )
    results.append(_check("second call returns 409", r2.status_code == 409,
                          f"got {r2.status_code} body={r2.text[:200]}"))
    print()

    # ------------------------------------------------------------------ #
    # Test 5 — GET /bookings/{holdId} returns the booking               #
    # ------------------------------------------------------------------ #
    print("Test 5 — GET /bookings/{holdId}")
    r = client.get(f"/bookings/{hold_id}")
    results.append(_check("GET /bookings/{holdId} returned 200", r.status_code == 200,
                          f"got {r.status_code} body={r.text[:200]}"))
    if r.status_code == 200:
        b = r.json()
        results.append(_check("bookingId matches", b.get("bookingId") == booking_id))
        results.append(_check("holdId matches", b.get("holdId") == hold_id))
        results.append(_check("status is 'pending'", b.get("status") == "pending",
                              f"got {b.get('status')!r}"))

    # 404 for a hold with no booking
    r404 = client.get(f"/bookings/{ghost_id}")
    results.append(_check("GET /bookings/{unknown} returned 404", r404.status_code == 404))
    print()

    # ------------------------------------------------------------------ #
    # Test 6 — POST /payments with a malformed email                    #
    # ------------------------------------------------------------------ #
    print("Test 6 — POST /payments with malformed email")
    bad = client.post(
        "/payments",
        json={"holdId": str(uuid.uuid4()), "name": "Dan", "phone": "+15555550404",
              "email": "not-an-email"},
    )
    # pydantic should reject this with 422 from FastAPI's default
    # validation handler.
    results.append(_check("malformed email rejected (422)", bad.status_code == 422,
                          f"got {bad.status_code} body={bad.text[:200]}"))
    print()

    return _summary(results)


def _summary(results: list[bool]) -> int:
    total = len(results)
    passed = sum(1 for r in results if r)
    print("=" * 72)
    print(f"Step 6 verifier: {passed}/{total} assertions passed")
    print("=" * 72)
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())