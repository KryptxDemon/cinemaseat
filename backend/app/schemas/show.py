"""Show schemas — list/showtime payload for the SPA.

The frontend's ``Showtime`` type (in ``bdn/src/types/showtime.ts``)
expects flat camelCase fields plus a couple of derived counts. We
expose that shape from this module so the SPA's `getShows()` /
`getShowById()` calls line up with what the FastAPI router returns.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from humps import camelize
from pydantic import BaseModel, ConfigDict, Field


class ShowOut(BaseModel):
    """One show row as the SPA expects it."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    movie_id: UUID
    hall_id: UUID
    hall_name: str = Field(..., description="The theatre name (used as 'Hall' on the SPA).")
    start_time: datetime = Field(..., description="ISO datetime, timezone-aware.")
    date: str = Field(..., description="YYYY-MM-DD — derived from start_time.")
    format: str = Field("Standard 2D", description="Screening format label.")
    price_usd: float = Field(..., description="Per-seat base price in USD.")
    available_seats_count: int = Field(
        0, description="Count of show_seats with status='available' for this show."
    )


class ShowSeatOut(BaseModel):
    """One row in the seat map returned by GET /shows/{id}/seats."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID = Field(..., description="show_seats.id (used by POST /holds).")
    seat_id: UUID
    row_label: str
    col_label: int
    status: str = Field(..., description="'available' | 'held' | 'booked'.")
    price_usd: float = Field(..., description="Per-seat price for this show (base_price).")


class ShowSeatMapOut(BaseModel):
    """Wrapper returned by GET /shows/{id}/seats."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    show: ShowOut
    seats: list[ShowSeatOut]
    rows: list[str] = Field(default_factory=list)
    seats_per_row: int = 0
