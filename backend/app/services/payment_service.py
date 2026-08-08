"""Payment service — orchestrates mock gateway + booking confirmation.

Stubbed in Step 1.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.payment import PaymentCreateIn, PaymentOut


def charge_for_hold(db: Session, payload: PaymentCreateIn) -> PaymentOut:
    """Charge the customer for an active hold; on success, confirm the booking."""
    raise NotImplementedError("payment_service.charge_for_hold is not wired up yet")