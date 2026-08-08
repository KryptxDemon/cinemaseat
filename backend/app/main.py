"""CinemaSeat FastAPI backend.

This service exposes the booking domain:

  GET  /movies
  GET  /shows/{show_id}/seats
  POST /holds
  POST /payments
  GET  /bookings/{booking_id}
  GET  /bookings/{booking_id}/ticket   (PDF — Step 4)

The frontend talks to this service indirectly through the gateway
(which is the only thing exposed to the browser).
"""

from __future__ import annotations

from fastapi import FastAPI

from app.config import settings
from app.routers import bookings, holds, movies, payments, shows

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Concurrency-safe movie ticket booking service.",
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe for Docker / k8s."""
    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health probe for the demo stack.

    Returns ``{"status": "ok"}`` as long as the process is responsive.
    A real readiness probe would also DB-ping here, but for the
    demo we keep the endpoint stateless so the orchestrator can
    detect a started FastAPI without needing the database to be
    ready first (see ``depends_on`` in docker-compose.yml).
    """
    return {"status": "ok"}


# Routers — wired up in Step 1; endpoints are intentionally stubbed.
# Real implementations land in Steps 2 (seats + concurrency) and 3 (payment).
app.include_router(movies.router)
app.include_router(shows.router)
app.include_router(holds.router)
app.include_router(payments.router)
app.include_router(bookings.router)