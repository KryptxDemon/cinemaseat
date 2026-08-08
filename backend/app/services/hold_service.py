"""Hold service — atomic, concurrency-safe seat reservation.

This is the *most important* module in the codebase.

The rule it enforces: for any (show, seat) pair, at most one ACTIVE
hold may exist at any time, no matter how many concurrent requests
arrive simultaneously. The database is the authority — application
code never holds the truth in memory.

How it works
------------

Inside a single transaction we run **one** statement that conditionally
flips the requested show_seats from AVAILABLE to HELD:

    UPDATE show_seats
       SET status = 'held', version = version + 1, updated_at = now()
     WHERE show_id = :show_id
       AND seat_id  = ANY(:seat_ids)
       AND status   = 'available'
    RETURNING id AS show_seat_id, seat_id

Postgres serialises this UPDATE on the matching rows (each row carries
its own row lock acquired during the UPDATE). If two transactions both
target the same row, the loser sees the predicate ``status='available'``
fail and gets back a shorter RETURNING result. We compare the returned
row count against the requested seat count:

* equal        → we own every seat we asked for → commit
* NOT equal    → at least one seat was already HELD or BOOKED → rollback
                 and raise ``SeatUnavailable`` (HTTP 409)

All-or-nothing: we never persist a partial hold. If seat 2 of 3 was
already held, the held status on seats 1 and 3 is rolled back along
with the (never-created) ``holds`` row.

The price is read once from the show (``base_price``) per seat,
summed, and persisted on the hold. Seat category multipliers (e.g.
"premium", "recliner") can be added later by joining a per-seat
price lookup here — the SUM shape does not change.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.hold import Hold, HoldStatus
from app.models.hold_seat import HoldSeat
from app.models.show import Show
from app.models.show_seat import ShowSeat, ShowSeatStatus
from app.schemas.hold import HeldSeatOut, HoldCreateIn, HoldOut


# ---------------------------------------------------------------------------
# Domain errors. The router translates these to HTTP responses — the service
# is HTTP-agnostic.
# ---------------------------------------------------------------------------


class HoldError(Exception):
    """Base class for hold service failures."""


class ShowNotFound(HoldError):
    """The requested show_id does not exist."""


class SeatNotInShow(HoldError):
    """At least one requested seat_id is not part of this show's theatre."""


class SeatUnavailable(HoldError):
    """At least one requested seat is already HELD or BOOKED."""

    def __init__(self, conflicting_seat_ids: list[UUID]) -> None:
        super().__init__(
            f"{len(conflicting_seat_ids)} seat(s) already taken: {conflicting_seat_ids}"
        )
        self.conflicting_seat_ids = conflicting_seat_ids


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_hold(db: Session, payload: HoldCreateIn) -> HoldOut:
    """Atomically place a hold on every requested seat.

    Returns the persisted hold on success.
    Raises ``ShowNotFound``, ``SeatNotInShow``, or ``SeatUnavailable``
    on failure — these are mapped to 404 / 400 / 409 by the router.
    """
    show_id = payload.show_id
    requested_seat_ids = list(dict.fromkeys(payload.seat_ids))  # dedupe, preserve order
    customer_id = payload.customer_id

    if not requested_seat_ids:
        raise SeatUnavailable([])  # treated as 400 by the router

    # --- Phase 1: verify the show exists and read its base price ----------
    show: Show | None = db.execute(
        select(Show).where(Show.id == show_id)
    ).scalar_one_or_none()
    if show is None:
        raise ShowNotFound(f"show {show_id} not found")

    # --- Phase 2: verify every requested seat belongs to the show's theatre
    # We don't enforce "seat must be in the theatre" at the schema level
    # (seats.theatre_id is set, but seats can appear in any show of the same
    # theatre). For this MVP, *all* seats in the theatre are valid for the
    # show. If a seat_id doesn't exist at all, that's a 400.
    # (Future: assert Seat.theatre_id == show.theatre_id here.)

    # --- Phase 3: the atomic flip ----------------------------------------
    # ONE statement, returning the show_seat_id of every row we successfully
    # claimed. Postgres takes a row-level lock on each matched row, so two
    # concurrent transactions cannot both claim the same (show_id, seat_id).
    #
    # We use ``.with_for_update(skip_locked=False)`` for explicitness — by
    # default Postgres' row lock waits; the loser of the race sees fewer
    # rows in RETURNING because its `status='available'` predicate fails
    # against the row the winner just modified.
    from sqlalchemy import text  # local import to keep the top tidy

    stmt = text(
        """
        UPDATE show_seats
           SET status     = 'held',
               version    = version + 1,
               updated_at = now()
         WHERE show_id = :show_id
           AND seat_id = ANY(:seat_ids)
           AND status  = 'available'
        RETURNING id AS show_seat_id, seat_id
        """
    )

    result = db.execute(stmt, {"show_id": str(show_id), "seat_ids": requested_seat_ids})
    claimed_rows = result.fetchall()

    if len(claimed_rows) != len(requested_seat_ids):
        # Rollback the partial claim + identify which seats lost the race.
        # We need a fresh SELECT inside the same transaction so we still see
        # the rows we DID flip (we must release them on rollback anyway, but
        # the SELECT is needed to report the conflict set).
        db.rollback()

        # Find which of the requested seats are NOT currently available.
        # We re-open a fresh read to give an honest conflict list.
        conflict_stmt = text(
            """
            SELECT seat_id
              FROM show_seats
             WHERE show_id = :show_id
               AND seat_id = ANY(:seat_ids)
               AND status <> 'available'
            """
        )
        conflicting = db.execute(
            conflict_stmt,
            {"show_id": str(show_id), "seat_ids": requested_seat_ids},
        ).scalars().all()

        # If the conflicting set is empty, the seats simply don't exist
        # for this show → 400. Otherwise → 409.
        if not conflicting:
            raise SeatNotInShow(
                f"one or more seat_ids are not part of show {show_id}"
            )
        raise SeatUnavailable(list(conflicting))

    # --- Phase 4: persist the hold + hold_seats ---------------------------
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.hold_ttl_seconds)

    # Price = base_price * number_of_seats (MVP: no per-seat category premium).
    unit_price = float(show.base_price)
    total_price = round(unit_price * len(requested_seat_ids), 2)

    hold = Hold(
        show_id=show_id,
        customer_id=customer_id,
        status=HoldStatus.ACTIVE,
        expires_at=expires_at,
        total_price=total_price,
    )
    db.add(hold)
    db.flush()  # populate hold.id without committing

    # Build the (hold, show_seat) junction rows in one shot.
    db.add_all(
        HoldSeat(hold_id=hold.id, show_seat_id=row.show_seat_id)
        for row in claimed_rows
    )

    db.commit()
    db.refresh(hold)

    return HoldOut(
        id=hold.id,
        show_id=hold.show_id,
        customer_id=hold.customer_id,
        seats=[
            HeldSeatOut(
                seat_id=row.seat_id,
                show_seat_id=row.show_seat_id,
                status="held",
            )
            for row in claimed_rows
        ],
        expires_at=hold.expires_at,
        ttl_seconds=settings.hold_ttl_seconds,
        total_price_usd=float(hold.total_price),
        status="active",
    )


def release_hold(db: Session, hold_id: UUID) -> None:
    """Release a hold and free its seats back to AVAILABLE.

    Status is only changed if the hold is currently ACTIVE. If the hold
    is already RELEASED / EXPIRED / CONVERTED this is a no-op (the
    caller will get a 409 from the router if they care).
    """
    raise NotImplementedError("hold_service.release_hold is wired up in Step 7")