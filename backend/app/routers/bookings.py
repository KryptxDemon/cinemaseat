"""Bookings router — `GET /bookings/{booking_id}` and ticket PDF."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.booking import BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: str, db: Session = Depends(get_db)) -> BookingOut:
    """Look up one confirmed booking by id."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="GET /bookings/{id} will be wired up after Step 3.",
    )


@router.get("/{booking_id}/ticket")
def get_ticket(booking_id: str) -> bytes:
    """Render the booking as a PDF ticket (Step 4)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="GET /bookings/{id}/ticket (PDF) is part of Step 4.",
    )
