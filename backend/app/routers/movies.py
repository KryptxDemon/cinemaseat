"""Movies router — `GET /movies`."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie
from app.schemas import MovieOut

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("", response_model=list[MovieOut])
def list_movies(db: Session = Depends(get_db)) -> list[Movie]:
    """List all movies available for booking.

    Returns every row from ``movies`` with its poster/banner URLs so the
    SPA can render the catalogue grid and the featured hero banner. The
    URLs are intentionally relative (``/images/...``) because the SPA's
    static server is the source of truth for those assets.
    """
    return list(db.execute(select(Movie).order_by(Movie.title)).scalars())
