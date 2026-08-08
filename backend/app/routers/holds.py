"""Holds router — `POST /holds`.

Step 5: the handler now delegates to `hold_service.create_hold`, which
performs an atomic, all-or-nothing reservation. Three domain errors
are translated to HTTP responses:

    SeatNotInShow      → 400  (bad input — seat doesn't belong to show)
    ShowNotFound       → 404
    SeatUnavailable    → 409  (one or more seats already taken)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.hold import HoldCreateIn, HoldOut
from app.services import hold_service

router = APIRouter(prefix="/holds", tags=["holds"])


@router.post("", response_model=HoldOut, status_code=status.HTTP_201_CREATED)
def create_hold(
    payload: HoldCreateIn, db: Session = Depends(get_db)
) -> HoldOut:
    """Place a temporary hold on one or more seats for one customer.

    All requested seats succeed or fail together. On conflict the response
    is 409 and no seats are held.
    """
    try:
        return hold_service.create_hold(db, payload)
    except hold_service.ShowNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except hold_service.SeatNotInShow as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except hold_service.SeatUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "One or more seats are already taken.",
                "conflictingSeatIds": [str(s) for s in exc.conflicting_seat_ids],
            },
        )
