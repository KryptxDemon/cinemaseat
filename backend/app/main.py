"""CinemaSeat FastAPI backend.

This service implements the booking domain:

  GET  /movies
  GET  /shows/{show_id}/seats
  POST /holds
  POST /payments
  GET  /bookings/{booking_id}
  GET  /bookings/{booking_id}/ticket   (PDF)

The frontend talks to this service indirectly through the gateway
(which is the only thing exposed to the browser).
"""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(
    title="CinemaSeat Backend",
    version="0.1.0",
    description="Concurrency-safe movie ticket booking service.",
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe for Docker / k8s."""
    return {"status": "ok"}


@app.get("/movies")
def list_movies() -> list[dict[str, object]]:
    """List all movies available for booking.

    TODO(backend): replace with a SQLAlchemy query against `movies`.
    """
    return []


@app.get("/shows/{show_id}/seats")
def list_seats(show_id: str) -> dict[str, object]:
    """Return the live seat map for a show.

    TODO(backend): replace with a query that joins shows + seats
    and overlays active holds.
    """
    return {"show": {"id": show_id}, "seats": []}