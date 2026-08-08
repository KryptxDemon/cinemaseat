"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-01-15 00:00:00

Creates every table for the CinemaSeat MVP. Generated to match the
SQLAlchemy models in ``app/models`` exactly — same column types,
same FK targets, same UNIQUE constraint names. The migration is the
contract that defines the database; the models are a typed view of
it.

Tables (in dependency order):
    customers, movies, theatres, shows, seats, show_seats,
    holds, bookings, booking_seats, payments, payment_events.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ----- customers ----------------------------------------------------
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_customers_email"),
    )
    op.create_index("ix_customers_email", "customers", ["email"])
    op.create_index("ix_customers_phone", "customers", ["phone"])

    # ----- movies -------------------------------------------------------
    op.create_table(
        "movies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("poster_url", sa.String(512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ----- theatres -----------------------------------------------------
    op.create_table(
        "theatres",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("rows", sa.Integer(), nullable=False),
        sa.Column("cols", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ----- shows --------------------------------------------------------
    op.create_table(
        "shows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "movie_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("movies.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "theatre_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("theatres.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("base_price", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ----- seats --------------------------------------------------------
    op.create_table(
        "seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "theatre_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("theatres.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("row_label", sa.String(8), nullable=False),
        sa.Column("col_label", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "theatre_id", "row_label", "col_label", name="uq_seat_theatre_row_col"
        ),
    )
    op.create_index("ix_seats_theatre_id", "seats", ["theatre_id"])

    # ----- show_seats ---------------------------------------------------
    op.create_table(
        "show_seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "show_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("shows.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "seat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("seats.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "available",
                "held",
                "booked",
                name="show_seat_status",
                native_enum=False,
                length=16,
            ),
            nullable=False,
            server_default="available",
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("show_id", "seat_id", name="uq_show_seat_show_seat"),
    )
    op.create_index("ix_show_seats_show_id", "show_seats", ["show_id"])
    op.create_index("ix_show_seats_seat_id", "show_seats", ["seat_id"])
    op.create_index("ix_show_seats_status", "show_seats", ["status"])

    # ----- holds --------------------------------------------------------
    op.create_table(
        "holds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "show_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("shows.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "released",
                "expired",
                "converted",
                name="hold_status",
                native_enum=False,
                length=16,
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_holds_show_id", "holds", ["show_id"])
    op.create_index("ix_holds_customer_id", "holds", ["customer_id"])
    op.create_index("ix_holds_status", "holds", ["status"])
    op.create_index("ix_holds_expires_at", "holds", ["expires_at"])

    # ----- bookings -----------------------------------------------------
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "show_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("shows.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "hold_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("holds.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "confirmed",
                "cancelled",
                "expired",
                name="booking_status",
                native_enum=False,
                length=16,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_show_id", "bookings", ["show_id"])
    op.create_index("ix_bookings_hold_id", "bookings", ["hold_id"])
    op.create_index("ix_bookings_status", "bookings", ["status"])

    # ----- booking_seats ------------------------------------------------
    op.create_table(
        "booking_seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "seat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("seats.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("booking_id", "seat_id", name="uq_booking_seat_booking_seat"),
    )
    op.create_index("ix_booking_seats_booking_id", "booking_seats", ["booking_id"])
    op.create_index("ix_booking_seats_seat_id", "booking_seats", ["seat_id"])

    # ----- payments -----------------------------------------------------
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "success",
                "failed",
                name="payment_status",
                native_enum=False,
                length=16,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("gateway_reference", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_status", "payments", ["status"])

    # ----- payment_events ----------------------------------------------
    op.create_table(
        "payment_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "payment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("payments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_id", sa.String(128), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("detail", sa.String(1024), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("event_id", name="uq_payment_events_event_id"),
    )
    op.create_index(
        "ix_payment_events_payment_id", "payment_events", ["payment_id"]
    )


def downgrade() -> None:
    # Drop in reverse FK dependency order.
    op.drop_index("ix_payment_events_payment_id", table_name="payment_events")
    op.drop_table("payment_events")

    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_booking_seats_seat_id", table_name="booking_seats")
    op.drop_index("ix_booking_seats_booking_id", table_name="booking_seats")
    op.drop_table("booking_seats")

    op.drop_index("ix_bookings_status", table_name="bookings")
    op.drop_index("ix_bookings_hold_id", table_name="bookings")
    op.drop_index("ix_bookings_show_id", table_name="bookings")
    op.drop_index("ix_bookings_customer_id", table_name="bookings")
    op.drop_table("bookings")

    op.drop_index("ix_holds_expires_at", table_name="holds")
    op.drop_index("ix_holds_status", table_name="holds")
    op.drop_index("ix_holds_customer_id", table_name="holds")
    op.drop_index("ix_holds_show_id", table_name="holds")
    op.drop_table("holds")

    op.drop_index("ix_show_seats_status", table_name="show_seats")
    op.drop_index("ix_show_seats_seat_id", table_name="show_seats")
    op.drop_index("ix_show_seats_show_id", table_name="show_seats")
    op.drop_table("show_seats")

    op.drop_index("ix_seats_theatre_id", table_name="seats")
    op.drop_table("seats")

    op.drop_table("shows")
    op.drop_table("theatres")
    op.drop_table("movies")

    op.drop_index("ix_customers_phone", table_name="customers")
    op.drop_index("ix_customers_email", table_name="customers")
    op.drop_table("customers")