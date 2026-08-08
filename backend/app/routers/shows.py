"""Shows router — `GET /shows`, `GET /shows/{show_id}`, `GET /shows/{show_id}/seats`.

The frontend (bdn/src/api/shows.ts) expects a list of ``Showtime`` rows
with camelCase fields, and per-show seat maps with each show_seat's
(row, col, status, price). This router serves both.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.seat import Seat
from app.models.show import Show
from app.models.show_seat import ShowSeat, ShowSeatStatus
from app.schemas.show import ShowOut, ShowSeatMapOut, ShowSeatOut

router = APIRouter(prefix="/shows", tags=["shows"])


def _show_to_out(show: Show, available_count: int) -> ShowOut:
    """Map a ``Show`` row + its available-seat count to the SPA schema."""
    return ShowOut(
        id=show.id,
        movie_id=show.movie_id,
        hall_id=show.theatre_id,
        hall_name=show.theatre.name if show.theatre else "Theatre",
        start_time=show.start_time,
        date=show.start_time.date().isoformat(),
        format="Standard 2D",  # placeholder; no format column on `shows` yet
        price_usd=float(show.base_price),
        available_seats_count=int(available_count or 0),
    )


@router.get("", response_model=list[ShowOut], summary="List all shows")
def list_shows(
    movie_id: UUID | None = None,
    db: Session = Depends(get_db),
) -> list[ShowOut]:
    """Return every show, optionally filtered by ``?movie_id=``."""
    stmt = select(Show).order_by(Show.start_time)
    if movie_id is not None:
        stmt = stmt.where(Show.movie_id == movie_id)
    shows = list(db.execute(stmt).scalars())

    avail_rows = db.execute(
        select(ShowSeat.show_id, func.count(ShowSeat.id))
        .where(ShowSeat.status == ShowSeatStatus.AVAILABLE)
        .group_by(ShowSeat.show_id)
    ).all()
    available_by_show: dict[UUID, int] = {sid: cnt for sid, cnt in avail_rows}

    return [_show_to_out(s, available_by_show.get(s.id, 0)) for s in shows]


@router.get("/{show_id}", response_model=ShowOut, summary="Get a single show")
def get_show(show_id: UUID, db: Session = Depends(get_db)) -> ShowOut:
    show = db.execute(select(Show).where(Show.id == show_id)).scalar_one_or_none()
    if show is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"show {show_id} not found",
        )
    avail = db.execute(
        select(func.count(ShowSeat.id)).where(
            ShowSeat.show_id == show_id,
            ShowSeat.status == ShowSeatStatus.AVAILABLE,
        )
    ).scalar_one()
    return _show_to_out(show, avail)


@router.get(
    "/{show_id}/seats",
    response_model=ShowSeatMapOut,
    summary="Live seat map for a show",
)
def list_seats(show_id: UUID, db: Session = Depends(get_db)) -> ShowSeatMapOut:
    """Join show_seats + seats so the SPA can render row/col/status."""
    show = db.execute(select(Show).where(Show.id == show_id)).scalar_one_or_none()
    if show is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"show {show_id} not found",
        )

    seat_rows = db.execute(
        select(ShowSeat, Seat)
        .join(Seat, Seat.id == ShowSeat.seat_id)
        .where(ShowSeat.show_id == show_id)
        .order_by(Seat.row_label, Seat.col_label)
    ).all()

    seats_out: list[ShowSeatOut] = []
    row_labels: set[str] = set()
    seats_per_row: dict[str, int] = {}
    for ss, seat in seat_rows:
        status_str = ss.status.value if hasattr(ss.status, "value") else str(ss.status)
        seats_out.append(
            ShowSeatOut(
                id=ss.id,
                seat_id=ss.seat_id,
                row_label=seat.row_label,
                col_label=seat.col_label,
                status=status_str,
                price_usd=float(show.base_price),
            )
        )
        row_labels.add(seat.row_label)
        seats_per_row[seat.row_label] = seats_per_row.get(seat.row_label, 0) + 1

    sorted_rows = sorted(row_labels)
    max_cols = max(seats_per_row.values()) if seats_per_row else 0
    available_count = sum(
        1 for s in seats_out if s.status == ShowSeatStatus.AVAILABLE.value
    )

    return ShowSeatMapOut(
        show=_show_to_out(show, available_count),
        seats=seats_out,
        rows=sorted_rows,
        seats_per_row=max_cols,
    )
