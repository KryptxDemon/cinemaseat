#!/bin/sh
# Backend container entrypoint.
#
# 1. Wait for PostgreSQL to accept connections (avoids a race where
#    `docker compose up` brings the backend up before Postgres is ready).
# 2. Run `alembic upgrade head` so the schema is current on every fresh
#    startup. The migrations are idempotent — re-running them is a no-op.
# 3. exec uvicorn as PID 1 so signals (SIGTERM, SIGINT) propagate and
#    docker stop shuts the app down cleanly.
#
# Kept intentionally minimal: no Python pre-flight, no health probes,
# no fancy orchestration. The docker-compose `depends_on:
# condition: service_healthy` already gates startup on Postgres health.

set -e

# --- 1. Wait for PostgreSQL -------------------------------------------------
echo "[entrypoint] waiting for database at ${DATABASE_URL}..."
python - <<'PY'
import os
import sys
import time

import psycopg

# Compose sets DATABASE_URL like
#   postgresql+psycopg://postgres:postgres@postgres:5432/cinemaseat
# Strip the SQLAlchemy driver prefix so psycopg can connect.
url = os.environ.get("DATABASE_URL", "")
url = url.replace("postgresql+psycopg://", "postgresql://", 1)

deadline = time.time() + 60  # 60s total; Postgres usually <5s on Linux
while True:
    try:
        with psycopg.connect(url, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        print("[entrypoint] database is ready")
        break
    except Exception as exc:  # noqa: BLE001 — we want to retry on anything
        if time.time() > deadline:
            print(f"[entrypoint] database not ready after 60s: {exc}", file=sys.stderr)
            sys.exit(1)
        time.sleep(1)
PY

# --- 2. Run migrations ------------------------------------------------------
echo "[entrypoint] running alembic upgrade head..."
alembic upgrade head

# --- 3. Start the API -------------------------------------------------------
echo "[entrypoint] launching uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
