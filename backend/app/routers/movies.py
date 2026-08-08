"""Movies router — `GET /movies`."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("")
def list_movies() -> list[dict[str, object]]:
    """List all movies available for booking.

    TODO(backend): replace with a SQLAlchemy query against `movies`.
    """
    return []
