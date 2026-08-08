"""Payment service — public-facing entry point for the payment flow.

A thin re-export of ``booking_service.create_booking_for_hold``. Kept
as its own module so the router can import a single name and so we
have an obvious place to add payment-only concerns (retries, audit
log, idempotency keys, …) later without touching booking_service.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.payment import PaymentCreateIn, PaymentInitiatedOut
from app.services.booking_service import create_booking_for_hold

__all__ = ["create_payment_for_hold", "create_booking_for_hold"]


def create_payment_for_hold(
    db: Session, payload: PaymentCreateIn
) -> PaymentInitiatedOut:
    """Initiate a payment for an active hold. Returns the pending acknowledgement."""
    return create_booking_for_hold(db, payload)