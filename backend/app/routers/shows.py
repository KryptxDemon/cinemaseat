"""Shows router — `GET /shows/{show_id}/seats`."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/shows", tags=["shows"])


@router.get("/{show_id}/seats")
def list_seats(show_id: str) -> dict[str, object]:
    """Return the live seat map for a show.

    TODO(backend): replace with a query that joins shows + seats
    and overlays active holds.
    """
    return {"show": {"id": show_id}, "seats": []}
