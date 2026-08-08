"""Holds router — `POST /holds`."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.hold import HoldCreateIn, HoldOut
from app.services import hold_service

router = APIRouter(prefix="/holds", tags=["holds"])


@router.post("", response_model=HoldOut, status_code=status.HTTP_201_CREATED)
def create_hold(payload: HoldCreateIn, db: Session = Depends(get_db)) -> HoldOut:
    """Place a temporary hold on one seat for one customer."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /holds will be wired up after Step 2 (seats + concurrency).",
    )
