"""Seat model — one *physical* seat in a theatre.

A seat has no global status. Its availability is determined **per show**
via the `show_seats` table, because the same physical seat can be
available for one show and held for another.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    theatre_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("theatres.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    row_label: Mapped[str] = mapped_column(String(8), nullable=False)
    col_label: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # A theatre cannot have two seats at the same (row, col).
    __table_args__ = (
        UniqueConstraint("theatre_id", "row_label", "col_label", name="uq_seat_theatre_row_col"),
    )
