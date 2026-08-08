"""add hold_seats

Revision ID: 0002_hold_seats
Revises: 0001_initial_schema
Create Date: 2026-01-15 12:00:00

Adds the ``hold_seats`` junction table. Holds were previously described
as just ``(show_id, customer_id, expires_at, total_price)`` with no
record of which seats they reserved. Step 5 makes holds into a
reservation of *N* seats, so we need a row per (hold, show_seat).

A (hold_id, show_seat_id) UNIQUE constraint prevents the same show_seat
appearing twice in one hold; the indexes on hold_id and show_seat_id
support the lookup patterns used by the hold/booking services.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_hold_seats"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hold_seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "hold_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("holds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "show_seat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("show_seats.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "hold_id", "show_seat_id", name="uq_hold_seat_hold_show_seat"
        ),
    )
    op.create_index("ix_hold_seats_hold_id", "hold_seats", ["hold_id"])
    op.create_index("ix_hold_seats_show_seat_id", "hold_seats", ["show_seat_id"])


def downgrade() -> None:
    op.drop_index("ix_hold_seats_show_seat_id", table_name="hold_seats")
    op.drop_index("ix_hold_seats_hold_id", table_name="hold_seats")
    op.drop_table("hold_seats")