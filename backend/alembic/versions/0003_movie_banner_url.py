"""add movie banner_url

Revision ID: 0003_movie_banner_url
Revises: 0002_hold_seats
Create Date: 2026-08-08 12:00:00

Adds a ``banner_url`` column to ``movies`` so the SPA can render the
featured-hero background image referenced in ``MoviesPage.tsx``. The
URL is relative (``/images/<file>.jpg``) because the SPA's static
server (nginx in production, Vite in dev) is the source of truth for
those assets — they live in ``bdn/public/images/``.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_movie_banner_url"
down_revision = "0002_hold_seats"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "movies",
        sa.Column("banner_url", sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("movies", "banner_url")