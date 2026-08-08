"""HoldSeat junction — which (show, seat) pairs a hold has reserved.

A hold is scoped to a *show* and reserves one or more physical seats.
We persist the resolution ``(show_seat)`` rather than the raw seat_id
because the unit of contention is the show_seat row (its status
flips AVAILABLE -> HELD -> BOOKED).

The same hold cannot contain the same show_seat twice — that's what
``UNIQUE(hold_id, show_seat_id)`` prevents at the DB level.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HoldSeat(Base):
    __tablename__ = "hold_seats"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    hold_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("holds.id", ondelete="CASCADE"),
        nullable=False,
    )
    show_seat_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("show_seats.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        # A hold cannot contain the same show_seat twice.
        UniqueConstraint("hold_id", "show_seat_id", name="uq_hold_seat_hold_show_seat"),
        Index("ix_hold_seats_hold_id", "hold_id"),
        Index("ix_hold_seats_show_seat_id", "show_seat_id"),
    )
