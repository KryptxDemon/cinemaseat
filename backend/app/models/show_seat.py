"""ShowSeat model — the per-show availability row.

This is the table the hold/booking services lock against when reserving
seats. It carries the show-scoped `status` and a `version` column used
for optimistic concurrency control.

`status` is the only place seat availability is stored. Reading
"which seats are available for show X" is a single query against
`show_seats WHERE show_id = X AND status = 'available'`.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ShowSeatStatus(str, Enum):
    AVAILABLE = "available"
    HELD = "held"
    BOOKED = "booked"


class ShowSeat(Base):
    __tablename__ = "show_seats"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    show_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("shows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("seats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[ShowSeatStatus] = mapped_column(
        # The DB column stores lowercase values ("available", "held", "booked")
        # because the alembic migration created it with those literals. The
        # Python enum uses SCREAMING_SNAKE names; values_callable bridges the
        # gap so SQLAlchemy compares against the .value strings.
        SAEnum(
            ShowSeatStatus,
            name="show_seat_status",
            native_enum=False,
            length=16,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ShowSeatStatus.AVAILABLE,
        index=True,
    )
    # Optimistic-locking counter — bumped on every status change.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # The same physical seat can only appear once per show.
    __table_args__ = (
        # Composite UNIQUE — also serves as (show_id, seat_id) lookup index.
        UniqueConstraint("show_id", "seat_id", name="uq_show_seat_show_seat"),
    )
