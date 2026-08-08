"""PaymentEvent model — append-only audit log of payment lifecycle events.

The gateway callback includes an ``event_id`` (the gateway's own
identifier). We persist it as a UNIQUE column so duplicate callbacks
fail at the database level rather than producing duplicate rows.
This is the foundation of idempotent webhook handling.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    payment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Gateway-supplied identifier. DB-level UNIQUE — the FIRST insert
    # for a given event_id succeeds; any duplicate callback raises an
    # IntegrityError, which the callback handler treats as "already processed".
    event_id: Mapped[str] = mapped_column(String(128), nullable=False)

    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("event_id", name="uq_payment_events_event_id"),
        Index("ix_payment_events_payment_id", "payment_id"),
    )
