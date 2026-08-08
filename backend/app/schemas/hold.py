"""Hold schemas — request to hold one or more seats in a show, response with TTL.

Step 5: the request now carries a *list* of seat IDs (the spec example
is `seatIds: [25]`), and the response surfaces the resolved show_seats
so the client can render them.

Atomicity is guaranteed by the service layer, NOT by the schema —
the schema only describes the wire format.
"""

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

    show_id: UUID = Field(..., description="The show the customer wants seats in.")
    seat_ids: list[UUID] = Field(
        ..., min_length=1, description="Physical seat IDs to hold. All-or-nothing."
    )
    customer_id: UUID | None = Field(
        None,
        description=(
            "Optional. The customer placing the hold. When omitted the "
            "service creates an anonymous 'guest' customer row so the SPA "
            "can reserve seats before the customer has provided contact info."
        ),
    )


class HeldSeatOut(BaseModel):
    """One of the seats the hold reserved (echoed back to the client)."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    seat_id: UUID
    show_seat_id: UUID
    status: str  # "held"


class HoldOut(BaseModel):
    """Response for `POST /holds` — the client must pay before `expires_at`."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    id: UUID
    show_id: UUID
    customer_id: UUID
    seats: list[HeldSeatOut]
    expires_at: datetime
    ttl_seconds: int = Field(..., description="Seconds until the hold expires.")
    total_price_usd: float
    status: str  # "active"
