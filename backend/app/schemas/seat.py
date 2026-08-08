"""Seat schemas — what `/shows/{id}/seats` returns to the frontend."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize  # installed as `pyhumps`, imports as `humps`
from pydantic import BaseModel, ConfigDict

from app.models.seat import SeatStatus


class SeatOut(BaseModel):
    """Single seat in a show's seat map."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    show_id: UUID
    row_label: int
    col_label: int
    status: SeatStatus
    version: int


class SeatMapOut(BaseModel):
    """Full seat map for a show, including the show's id."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    show_id: UUID
    seats: list[SeatOut]
    fetched_at: datetime
