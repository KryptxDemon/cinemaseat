"""Booking service — read-side of confirmed bookings.

Stubbed in Step 1.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.booking import BookingOut


def get_booking(db: Session, booking_id: str) -> BookingOut:
    """Look up one confirmed booking by id."""
    raise NotImplementedError("booking_service.get_booking is not wired up yet")