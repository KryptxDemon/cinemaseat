"""Hold service — business logic for creating/releasing seat holds.

Stubbed in Step 1; concurrency-safe `try_acquire_hold` is the next thing
we'll write.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.hold import HoldCreateIn, HoldOut


def create_hold(db: Session, payload: HoldCreateIn) -> HoldOut:
    """Attempt to place a temporary hold on one seat for one customer.

    TODO(backend): implement with `SELECT ... FOR UPDATE` + version check.
    """
    raise NotImplementedError("hold_service.create_hold is not wired up yet")


def release_hold(db: Session, hold_id: str) -> None:
    """Mark a hold as released and free the underlying seat."""
    raise NotImplementedError("hold_service.release_hold is not wired up yet")