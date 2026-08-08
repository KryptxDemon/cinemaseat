"""Booking service — create the booking + payment row, call the gateway.

This module owns the *write* side of the payment flow. ``POST /payments``
delegates here, and we:

  1. Validate the hold exists, is still ACTIVE, and has not expired.
  2. Look up (or create) the Customer record by email.
  3. Create the Booking row (status=PENDING), link every held seat
     via ``booking_seats``.
  4. Create the Payment row (status=PENDING, gateway_reference=null).
  5. Submit the charge to the mock gateway.
  6. Persist the gateway's ``payment_id`` on the Payment row.
  7. Flip the Hold to CONVERTED so no future POST /payments can
     pay for the same hold twice.

The gateway is called *synchronously* — but only for its
``202 {payment_id, status:"PENDING"}`` acknowledgement. The actual
SUCCEEDED/FAILED outcome arrives later via the gateway's async
callback to ``POST /payments/callback`` (Step 7). That means a network
failure on the ``/charge`` call does NOT block the booking — we
record the payment as ``PENDING`` with no gateway_reference and let
the callback reconcile later (or surface the error to the user).

Why a transaction?
------------------
Customer / Booking / Payment / Hold-status-flip must all succeed
together. If the gateway fails mid-flight we still want the booking
row to exist (status=PENDING, payment.status=PENDING) so the callback
handler can find it by gateway_reference / booking_ref and update it.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.booking import Booking, BookingStatus
from app.models.booking_seat import BookingSeat
from app.models.customer import Customer
from app.models.hold import Hold, HoldStatus
from app.models.hold_seat import HoldSeat
from app.models.show_seat import ShowSeat
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreateIn, PaymentInitiatedOut
from app.services import gateway_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain errors. Routers translate these to HTTP responses.
# ---------------------------------------------------------------------------


class BookingError(Exception):
    """Base class for booking service failures."""


class HoldNotFound(BookingError):
    """No hold with that id."""


class HoldExpired(BookingError):
    """The hold has already passed its expires_at."""

    def __init__(self, hold_id: UUID) -> None:
        super().__init__(f"hold {hold_id} has expired")
        self.hold_id = hold_id


class HoldAlreadyProcessed(BookingError):
    """The hold has already been converted into a booking."""

    def __init__(self, hold_id: UUID) -> None:
        super().__init__(f"hold {hold_id} has already been processed")
        self.hold_id = hold_id


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _find_or_create_customer(db: Session, *, name: str, email: str, phone: str) -> Customer:
    """Look up an existing customer by email (case-insensitive) or create one.

    Email is matched case-insensitively but stored as-supplied (we
    normalise to lower-case before lookup so two customers with the
    same email in different cases collapse to one row).
    """
    normalized = email.strip().lower()
    existing = db.execute(
        select(Customer).where(Customer.email == normalized)
    ).scalar_one_or_none()
    if existing is not None:
        # Refresh the contact details so repeat purchases with a
        # new phone number still reflect the buyer's latest info.
        existing.name = name
        existing.phone = phone
        return existing

    customer = Customer(name=name, email=normalized, phone=phone)
    db.add(customer)
    db.flush()  # populate customer.id without committing
    return customer


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_booking_for_hold(
    db: Session, payload: PaymentCreateIn
) -> PaymentInitiatedOut:
    """Materialise a hold into a Booking + Payment row.

    See module docstring for the full flow. Returns the
    ``PaymentInitiatedOut`` that the router turns into a 202 response.
    """
    hold_id = payload.hold_id
    hold: Hold | None = db.execute(
        select(Hold).where(Hold.id == hold_id)
    ).scalar_one_or_none()
    if hold is None:
        raise HoldNotFound(f"hold {hold_id} not found")

    # If the hold has already been paid for, refuse — the spec says
    # POST /payments must be idempotent against the *hold*, not against
    # the request. A second call returns 409 with the existing booking
    # id (the router maps this to a 409 response).
    if hold.status is HoldStatus.CONVERTED:
        raise HoldAlreadyProcessed(hold.id)

    # If the hold has been released or expired, refuse.
    if hold.status is HoldStatus.EXPIRED or hold.status is HoldStatus.RELEASED:
        raise HoldExpired(hold.id)

    # Lazy expiry: even if status is still ACTIVE, the clock may have
    # run out. We don't flip it here — the next POST /holds would do
    # that — we just refuse to convert a hold whose expires_at <= now.
    now = datetime.now(timezone.utc)
    if hold.expires_at <= now:
        raise HoldExpired(hold.id)

    # --- Phase 1: customer ---------------------------------------------
    customer = _find_or_create_customer(
        db,
        name=payload.name,
        email=payload.normalized_email(),
        phone=payload.phone,
    )

    # --- Phase 2: booking + booking_seats -------------------------------
    booking = Booking(
        show_id=hold.show_id,
        customer_id=customer.id,
        hold_id=hold.id,
        status=BookingStatus.PENDING,
        total_amount=hold.total_price,
    )
    db.add(booking)
    db.flush()  # populate booking.id

    held_seat_ids: list[UUID] = list(
        db.execute(
            select(ShowSeat.seat_id)
            .join(HoldSeat, HoldSeat.show_seat_id == ShowSeat.id)
            .where(HoldSeat.hold_id == hold.id)
        ).scalars()
    )
    if not held_seat_ids:
        # Defensive — a hold with zero seats shouldn't exist.
        raise BookingError(f"hold {hold.id} has no associated seats")

    db.add_all(
        BookingSeat(booking_id=booking.id, seat_id=seat_id)
        for seat_id in held_seat_ids
    )

    # --- Phase 3: payment row (PENDING, no gateway ref yet) -------------
    payment = Payment(
        booking_id=booking.id,
        amount=hold.total_price,
        status=PaymentStatus.PENDING,
        gateway_reference=None,
    )
    db.add(payment)
    db.flush()  # populate payment.id

    # --- Phase 4: flip hold to CONVERTED -------------------------------
    # Done *inside* the same transaction as the booking create so
    # either both happen or neither does. The DB-level uniqueness on
    # (hold_id) means a second concurrent POST /payments for the same
    # hold will collide on the Booking insert (Booking.hold_id has no
    # UNIQUE constraint though, so we rely on the application-level
    # check below for the *common* path — the HoldStatus flip stops
    # the *next* caller).
    hold.status = HoldStatus.CONVERTED

    # Commit before calling the gateway. If the gateway call raises,
    # we have already persisted a booking + payment row, which is the
    # safer failure mode — the callback handler can reconcile from
    # there. If we crashed *before* committing, we'd lose the work.
    db.commit()
    db.refresh(booking)
    db.refresh(payment)
    db.refresh(customer)

    # --- Phase 5: fire the charge at the gateway ------------------------
    # This call returns a GatewayResult carrying the gateway's
    # payment_id, which we persist on the Payment row. If the call
    # raises (timeout / 5xx) we log and leave gateway_reference=null —
    # the booking is still in a consistent "pending" state.
    gateway_payment_id: str | None = None
    try:
        result = gateway_service.charge(
            amount=float(hold.total_price),
            currency=settings.default_currency,
            booking_ref=str(hold.id),  # callback handler will match on this
        )
        gateway_payment_id = result.payment_id
        payment.gateway_reference = gateway_payment_id
        db.add(payment)
        db.commit()
    except gateway_service.GatewayError as exc:
        # The charge call failed (timeout / 5xx / rejected). The booking
        # and payment still exist in PENDING state; the callback handler
        # (Step 7) can still reconcile if the gateway eventually delivers
        # an event referencing this booking_ref. For now, log loudly so
        # an operator can see the payment was never accepted.
        logger.error(
            "gateway.charge failed for hold=%s booking=%s err=%s",
            hold.id,
            booking.id,
            exc,
        )
        # We do NOT re-raise: the spec is "fire-and-forget, return
        # pending immediately". The customer always sees a pending
        # booking; reconciliation happens via the callback.

    return PaymentInitiatedOut(
        status="pending",
        booking_id=booking.id,
        hold_id=hold.id,
        payment_id=payment.id,
        gateway_payment_id=gateway_payment_id,
        amount=float(booking.total_amount),
        currency=settings.default_currency,
        customer_id=customer.id,
        created_at=booking.created_at,
    )


# ---------------------------------------------------------------------------
# Read side — used by GET /bookings/{holdId}
# ---------------------------------------------------------------------------


def get_booking_by_hold(db: Session, hold_id: UUID) -> PaymentInitiatedOut | None:
    """Return the PaymentInitiatedOut for the booking made from this hold, or None."""
    booking: Booking | None = db.execute(
        select(Booking).where(Booking.hold_id == hold_id)
    ).scalar_one_or_none()
    if booking is None:
        return None
    payment: Payment | None = db.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    ).scalar_one_or_none()
    if payment is None:
        # Defensive — a booking should always have a payment row.
        return None

    if payment.status is PaymentStatus.SUCCESS or booking.status is BookingStatus.CONFIRMED:
        status_str = "confirmed"
    elif payment.status is PaymentStatus.FAILED or booking.status in (BookingStatus.CANCELLED, BookingStatus.EXPIRED):
        status_str = "failed"
    else:
        status_str = "pending"

    return PaymentInitiatedOut(
        status=status_str,
        booking_id=booking.id,
        hold_id=booking.hold_id or hold_id,
        payment_id=payment.id,
        gateway_payment_id=payment.gateway_reference,
        amount=float(booking.total_amount),
        currency=settings.default_currency,
        customer_id=booking.customer_id,
        created_at=booking.created_at,
    )