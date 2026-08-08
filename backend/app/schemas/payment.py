"""Payment schemas — request to pay, response with status."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize  # installed as `pyhumps`, imports as `humps`
from pydantic import BaseModel, ConfigDict

from app.models.payment import PaymentStatus


class PaymentCreateIn(BaseModel):
    """Payload for `POST /payments`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    hold_id: UUID
    customer_id: UUID
    # Mock-only — real gateway would redirect to its own page.
    card_token: str = "tok_test"


class PaymentOut(BaseModel):
    """Response for `POST /payments`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    customer_id: UUID
    amount: float
    status: PaymentStatus
    gateway_reference: str | None = None
    booking_id: UUID | None = None
    created_at: datetime
