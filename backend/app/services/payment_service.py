"""Payment service — public-facing entry point for the payment flow."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.hold_seat import HoldSeat
from app.models.payment import Payment, PaymentStatus
from app.models.payment_event import PaymentEvent
from app.models.show_seat import ShowSeat, ShowSeatStatus
from app.schemas.payment import (
    PaymentCallbackIn,
    PaymentCallbackOut,
    PaymentCreateIn,
    PaymentInitiatedOut,
)
from app.services.booking_service import create_booking_for_hold

logger = logging.getLogger(__name__)

__all__ = [
    "create_payment_for_hold",
    "create_booking_for_hold",
    "process_payment_callback",
]


def create_payment_for_hold(
    db: Session, payload: PaymentCreateIn
) -> PaymentInitiatedOut:
    """Initiate a payment for an active hold. Returns the pending acknowledgement."""
    return create_booking_for_hold(db, payload)


def process_payment_callback(
    db: Session, payload: PaymentCallbackIn
) -> PaymentCallbackOut:
    """Process an incoming payment outcome webhook from the gateway.

    Guarantees:
    1. ALWAYS returns HTTP 200 (PaymentCallbackOut(status="ok")).
    2. Idempotency: `event_id` is unique in DB (`payment_events`). Duplicate callbacks return 200 OK.
    3. Handles race conditions safely: retries looking up booking/payment if in-flight.
    4. Validates payment amount before confirming booking.
    5. SUCCEEDED -> payment.status=success, booking.status=confirmed, show_seats=booked.
    6. FAILED / REFUNDED -> payment.status=failed, booking.status=cancelled, show_seats=available.
    """
    # 1. Check idempotency: event_id already processed?
    existing_event = db.execute(
        select(PaymentEvent).where(PaymentEvent.event_id == payload.event_id)
    ).scalar_one_or_none()
    if existing_event is not None:
        logger.info("Ignoring duplicate callback event_id=%s", payload.event_id)
        return PaymentCallbackOut(status="ok", message="duplicate event ignored")

    # 2. Handle race condition: find matching Booking & Payment
    hold_uuid: UUID | None = None
    try:
        hold_uuid = UUID(payload.booking_ref)
    except (ValueError, TypeError):
        pass

    booking: Booking | None = None
    payment: Payment | None = None

    for attempt in range(5):
        if hold_uuid:
            booking = db.execute(
                select(Booking).where(Booking.hold_id == hold_uuid)
            ).scalar_one_or_none()

        if booking is None:
            payment = db.execute(
                select(Payment).where(Payment.gateway_reference == payload.payment_id)
            ).scalar_one_or_none()
            if payment is not None:
                booking = db.execute(
                    select(Booking).where(Booking.id == payment.booking_id)
                ).scalar_one_or_none()

        if booking is not None:
            break

        if attempt < 4:
            time.sleep(0.1)

    if booking is None:
        logger.warning(
            "Callback event_id=%s referenced unknown booking_ref=%s payment_id=%s",
            payload.event_id,
            payload.booking_ref,
            payload.payment_id,
        )
        return PaymentCallbackOut(status="ok", message="booking reference not found")

    if payment is None:
        payment = db.execute(
            select(Payment).where(Payment.booking_id == booking.id)
        ).scalar_one_or_none()

    if payment is None:
        logger.warning("No payment row found for booking_id=%s", booking.id)
        return PaymentCallbackOut(status="ok", message="payment row not found")

    # Ensure gateway_reference is recorded if it wasn't populated yet
    if not payment.gateway_reference:
        payment.gateway_reference = payload.payment_id

    # Check if already processed
    if (
        payment.status is not PaymentStatus.PENDING
        or booking.status is not BookingStatus.PENDING
    ):
        try:
            event = PaymentEvent(
                payment_id=payment.id,
                event_id=payload.event_id,
                event_type=payload.status,
                detail="Callback received for already processed payment",
                processed_at=datetime.now(timezone.utc),
            )
            db.add(event)
            db.commit()
        except IntegrityError:
            db.rollback()
        return PaymentCallbackOut(status="ok", message="payment already processed")

    # 3. Amount validation
    expected_amount = float(payment.amount)
    if abs(float(payload.amount) - expected_amount) > 0.01:
        logger.warning(
            "Amount mismatch for event_id=%s: expected %.2f, got %.2f",
            payload.event_id,
            expected_amount,
            payload.amount,
        )
        try:
            payment.status = PaymentStatus.FAILED
            booking.status = BookingStatus.CANCELLED
            event = PaymentEvent(
                payment_id=payment.id,
                event_id=payload.event_id,
                event_type=payload.status,
                detail=f"Amount mismatch: expected {expected_amount}, got {payload.amount}",
                processed_at=datetime.now(timezone.utc),
            )
            db.add(event)
            db.commit()
        except IntegrityError:
            db.rollback()
        return PaymentCallbackOut(status="ok", message="amount mismatch")

    # 4. Process payment status update atomically
    now = datetime.now(timezone.utc)
    status_upper = payload.status.upper()

    try:
        if status_upper == "SUCCEEDED":
            payment.status = PaymentStatus.SUCCESS
            booking.status = BookingStatus.CONFIRMED

            # Transition show_seats status to 'booked'
            if booking.hold_id:
                held_show_seat_ids = list(
                    db.execute(
                        select(HoldSeat.show_seat_id).where(
                            HoldSeat.hold_id == booking.hold_id
                        )
                    ).scalars()
                )
                if held_show_seat_ids:
                    db.execute(
                        update(ShowSeat)
                        .where(ShowSeat.id.in_(held_show_seat_ids))
                        .values(status=ShowSeatStatus.BOOKED, updated_at=now)
                    )

            event = PaymentEvent(
                payment_id=payment.id,
                event_id=payload.event_id,
                event_type=payload.status,
                detail="Payment succeeded",
                processed_at=now,
            )
            db.add(event)
            db.commit()
            return PaymentCallbackOut(status="ok", message="payment succeeded")

        else:
            # FAILED or REFUNDED
            payment.status = PaymentStatus.FAILED
            booking.status = BookingStatus.CANCELLED

            # Transition show_seats status back to 'available'
            if booking.hold_id:
                held_show_seat_ids = list(
                    db.execute(
                        select(HoldSeat.show_seat_id).where(
                            HoldSeat.hold_id == booking.hold_id
                        )
                    ).scalars()
                )
                if held_show_seat_ids:
                    db.execute(
                        update(ShowSeat)
                        .where(ShowSeat.id.in_(held_show_seat_ids))
                        .values(status=ShowSeatStatus.AVAILABLE, updated_at=now)
                    )

            event = PaymentEvent(
                payment_id=payment.id,
                event_id=payload.event_id,
                event_type=payload.status,
                detail=f"Payment {payload.status.lower()}",
                processed_at=now,
            )
            db.add(event)
            db.commit()
            return PaymentCallbackOut(
                status="ok", message=f"payment {payload.status.lower()}"
            )

    except IntegrityError:
        # Concurrent duplicate event_id insert prevented by UNIQUE constraint
        db.rollback()
        return PaymentCallbackOut(status="ok", message="duplicate event ignored")
    except Exception as exc:
        logger.exception("Unexpected error in process_payment_callback: %s", exc)
        db.rollback()
        return PaymentCallbackOut(status="ok", message=f"processed with error: {exc}")