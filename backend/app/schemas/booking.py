"""Booking schemas — confirmed ticket details returned to the user."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize  # installed as `pyhumps`, imports as `humps`
from pydantic import BaseModel, ConfigDict


class BookingOut(BaseModel):
    """Response for `GET /bookings/{id}`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    show_id: UUID
    seat_id: UUID
    customer_id: UUID
    amount_paid: float
    booked_at: datetime
