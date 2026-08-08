"""Bookings router — ``GET /bookings/{holdId}`` and ticket PDF.

In Phase 6 the confirm flow is asynchronous: the gateway POSTs a
callback to ``POST /payments/callback`` that flips the booking from
``pending`` to ``confirmed`` or ``failed``. The frontend polls
``GET /bookings/{holdId}`` to see the latest state.

The ticket PDF endpoint is intentionally a stub for now — it lands
in a later step.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.payment import PaymentInitiatedOut
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/{hold_id}", response_model=PaymentInitiatedOut)
def get_booking_by_hold(
    hold_id: UUID, db: Session = Depends(get_db)
) -> PaymentInitiatedOut:
    """Look up the booking that was created from a given hold.

    Returns the same payload shape as ``POST /payments`` so the
    frontend can render either flow uniformly. 404 if no booking
    exists for that hold id (e.g. the customer never paid, or the
    hold expired before being paid).
    """
    result = booking_service.get_booking_by_hold(db, hold_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no booking found for hold {hold_id}",
        )
    return result


@router.get("/{booking_id}/ticket")
def get_ticket(booking_id: UUID) -> bytes:
    """Render the booking as a PDF ticket (later step)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="GET /bookings/{id}/ticket (PDF) lands in a later step.",
    )
