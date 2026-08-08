# CinemaSeat

A scalable, reliable movie-ticket booking platform built for the
hackathon. From a clean clone:

```bash
docker compose up
```

…brings up postgres, the FastAPI backend, the payment gateway, and
the React frontend on a single Docker network. See
[`BRANCHES.md`](./BRANCHES.md) for the multi-branch development
model.

## Architecture

```
                    ┌────────────────────────┐
   Browser ───────▶│  Nginx  (frontend :80) │
                    └──────────┬─────────────┘
                               │ http://gateway:8080
                    ┌──────────▼─────────────┐
                    │  mock-gateway  (:8080) │
                    └──────────┬─────────────┘
                               │ http://backend:8000
                    ┌──────────▼─────────────┐
                    │  FastAPI  (backend)    │
                    └──────────┬─────────────┘
                               │ SQLAlchemy
                    ┌──────────▼─────────────┐
                    │  PostgreSQL 16         │
                    └────────────────────────┘
```

## Endpoints (final, after merge)

| Method | Path | Service |
| :--- | :--- | :--- |
| GET  | `/healthz` | frontend, gateway, backend |
| GET  | `/movies` | frontend → gateway → backend |
| GET  | `/shows/{show_id}/seats` | frontend → gateway → backend |
| POST | `/holds` | frontend → gateway → backend |
| POST | `/payments` | frontend → gateway → backend |
| GET  | `/bookings/{booking_id}` | frontend → gateway → backend |
| GET  | `/bookings/{booking_id}/ticket` | frontend → gateway → backend (PDF) |

## Branches

- `frontend` — `bdn/` React + Vite SPA
- `backend` — `backend/` FastAPI service
- `devops` — `.github/`, `devops/docker-compose.yml`, load test
- `main` — merge target

See [`BRANCHES.md`](./BRANCHES.md) and [`DECISIONS.md`](./DECISIONS.md).