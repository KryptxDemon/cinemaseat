# CinemaSeat Backend

FastAPI service that backs the CinemaSeat booking flow.

## Endpoints

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET  | `/healthz` | Liveness probe. |
| GET  | `/movies` | List movies. |
| GET  | `/shows/{show_id}/seats` | Live seat map. |
| POST | `/holds` | Reserve seats atomically. Returns `{holdId, expiresAt, totalPriceUSD}`. |
| POST | `/payments` | Confirm payment for a hold. Returns `{bookingId, status}`. |
| GET  | `/bookings/{booking_id}` | Fetch booking status. |
| GET  | `/bookings/{booking_id}/ticket` | Download PDF ticket. |

## Local dev

```bash
docker compose -f backend.docker-compose.yml up
```

Or directly:

```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

See `BRANCHES.md` for branch ownership and the integration story.