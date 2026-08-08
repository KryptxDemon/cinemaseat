# CinemaSeat Backend

FastAPI service that backs the CinemaSeat booking flow.

## Endpoints

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET  | `/healthz` | Liveness probe. |
| GET  | `/health`  | Liveness probe (used by Docker healthcheck). |
| GET  | `/movies` | List movies. |
| GET  | `/shows/{show_id}/seats` | Live seat map. |
| POST | `/holds` | Reserve seats atomically. Returns `{holdId, expiresAt, totalPriceUSD}`. |
| POST | `/payments` | Initiate payment for a hold. Returns `202 {status:"pending"}`. |
| POST | `/payments/callback` | Async webhook from the gateway. Always returns `200 {status:"ok"}`. |
| GET  | `/bookings/{holdId}` | Poll the booking status — `pending`, `confirmed`, or `failed`. |
| GET  | `/bookings/{booking_id}/ticket` | Download PDF ticket. |

## Run the full demo stack (Docker)

From the **repo root**:

```bash
cp .env.example .env          # edit values if you want to override defaults
docker compose up --build
```

This brings up Postgres, the FastAPI backend, the `asifmahmoud414/mock-gateway`
image, and the React frontend — all on a single Docker network. The backend
runs `alembic upgrade head` on startup, so the schema is current on every
fresh boot.

Services:

| Service  | Host port | Notes                                          |
| :---     | :---      | :---                                            |
| `db`      | `5432`    | Postgres 16, named volume `postgres_data`.     |
| `backend` | `8000`    | FastAPI / uvicorn. OpenAPI at `/docs`.         |
| `gateway` | `8080`    | `asifmahmoud414/mock-gateway:latest`.          |
| `frontend`| `3000`    | React SPA served by Nginx.                     |

Open <http://localhost:3000> in a browser.

## Health checks

The backend has two liveness endpoints:

* `GET /health` — used by the Docker healthcheck (and by the gateway's
  `depends_on` gate so the gateway only fires callbacks after the backend
  is ready).
* `GET /healthz` — same payload, kept for Kubernetes-style probes.

## Run migrations manually

Inside the running container:

```bash
docker compose exec backend alembic upgrade head
```

Or from the host with a Python virtualenv:

```bash
pip install -r backend/requirements.txt
DATABASE_URL=postgresql+psycopg://cinemaseat:cinemaseat@localhost:5432/cinemaseat \
    alembic upgrade head --config backend/alembic.ini --name alembic
```

`alembic upgrade head` is idempotent — re-running it on a current schema is a no-op.

## Local dev (no Docker)

```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

You will need a Postgres reachable at the DSN in `DATABASE_URL`
(default `postgresql+psycopg://cinemaseat:cinemaseat@localhost:5432/cinemaseat`).

See `BRANCHES.md` for branch ownership and the integration story.