"""Hold schemas — request to hold a seat, response with TTL."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize  # installed as `pyhumps`, imports as `humps`
from pydantic import BaseModel, ConfigDict, Field


class HoldCreateIn(BaseModel):
    """Payload for `POST /holds`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    show_id: UUID
    seat_id: UUID
    customer_id: UUID


class HoldOut(BaseModel):
    """Response for `POST /holds` — the client must pay before `expires_at`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    seat_id: UUID
    customer_id: UUID
    expires_at: datetime
    ttl_seconds: int = Field(..., description="Seconds until the hold expires.")
