"""Payments router — `POST /payments`."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.payment import PaymentCreateIn, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreateIn, db: Session = Depends(get_db)
) -> PaymentOut:
    """Charge the customer for an active hold."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /payments will be wired up in Step 3 (payment + booking).",
    )
