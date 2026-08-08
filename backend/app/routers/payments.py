"""Payments router — ``POST /payments``.

Step 6: this endpoint accepts a hold id + customer triple, creates the
Customer/Booking/Payment rows, fires the charge at the gateway, and
returns ``202 Accepted`` with ``{status: "pending"}`` immediately. The
real confirmation arrives via the gateway's async callback to
``POST /payments/callback`` (Step 7).

Response codes
--------------
    202 Accepted   → booking + payment persisted, charge submitted (or attempted)
    404 Not Found  → no hold with that id
    409 Conflict   → hold is expired, released, or already converted
    422            → pydantic-validated body shape
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.payment import PaymentCreateIn, PaymentInitiatedOut
from app.services import booking_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "",
    response_model=PaymentInitiatedOut,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_payment(
    payload: PaymentCreateIn, db: Session = Depends(get_db)
) -> PaymentInitiatedOut:
    """Initiate a payment for an active hold.

    Always returns 202 with ``status: "pending"`` on success. The
    client should poll ``GET /bookings/{holdId}`` to discover the
    final outcome once the gateway callback lands.
    """
    try:
        return booking_service.create_booking_for_hold(db, payload)
    except booking_service.HoldNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        )
    except booking_service.HoldExpired as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "The hold has expired.",
                "holdId": str(exc.hold_id),
            },
        )
    except booking_service.HoldAlreadyProcessed as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This hold has already been processed.",
                "holdId": str(exc.hold_id),
            },
        )
    except booking_service.BookingError as exc:
        # Catch-all for unexpected invariant violations.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"booking failed: {exc}",
        )
