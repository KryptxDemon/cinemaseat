"""Show model — a specific screening of a movie in a theatre at a time."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.movie import Movie
from app.models.theatre import Theatre


class Show(Base):
    __tablename__ = "shows"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    movie_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("movies.id", ondelete="RESTRICT"), nullable=False
    )
    theatre_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("theatres.id", ondelete="RESTRICT"), nullable=False
    )

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    movie: Mapped[Movie] = relationship("Movie", lazy="joined")
    theatre: Mapped[Theatre] = relationship("Theatre", lazy="joined")
