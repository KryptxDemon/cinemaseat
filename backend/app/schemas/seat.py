"""Seat schemas — what `/shows/{id}/seats` returns to the frontend.

Step 5: the seat map is a view over ``show_seats`` (per-show availability),
joined to the physical ``seats`` table for row/col labels. There is NO
``SeatStatus`` on the global ``seats`` table — status lives on
``show_seats`` and is read from there.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize  # installed as `pyhumps`, imports as `humps`
from pydantic import BaseModel, ConfigDict

from app.models.show_seat import ShowSeatStatus


class SeatOut(BaseModel):
    """Single seat in a show's seat map."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID                 # physical seat id
    show_seat_id: UUID       # show_seat row id (the unit of contention)
    row_label: str
    col_label: int
    status: ShowSeatStatus
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
