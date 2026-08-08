# CinemaSeat — Branch Ownership & Merge Map

This repository is split across four long-lived branches. Each branch
owns a **distinct subdirectory** of the codebase and a **distinct slice
of the integration stack**, so the branches can evolve independently
and merge cleanly into `main` at the end of the hackathon.

| Branch | Owner | Subdirectory | Service entry | What it ships |
| :--- | :--- | :--- | :--- | :--- |
| `frontend` | Frontend track | `bdn/` | `docker-compose.yml` (root, **frontend service only**) | React + Vite SPA, Nginx-routed, talks to the gateway at `:8080`. |
| `backend`  | Backend track  | `backend/` | `backend/docker-compose.yml` | FastAPI app, PostgreSQL access layer, concurrency-safe seat holds, payment callbacks. |
| `devops`   | DevOps track   | `devops/`  | `devops/docker-compose.yml` (full integration stack) | CI workflows, deployment scripts, load-test harness, the final `docker-compose.yml` that wires all three services together. |
| `main`     | Integration    | (root)     | `docker-compose.yml` (final integration compose, replaces this file at the very end) | `BRANCHES.md`, `README.md`, `DECISIONS.md`. Receives PRs from the three working branches. |

## Root files — ownership rules

To avoid merge conflicts, the four branches **never edit the same root
file**. Each branch owns exactly one of:

| Root file | Owner |
| :--- | :--- |
| `README.md` | All four branches carry a one-line stub that points to their subdirectory. `main` carries the final merged summary. |
| `DECISIONS.md` | Same convention as `README.md`. |
| `docker-compose.yml` | `devops` carries the **full integration compose** in `devops/docker-compose.yml`. `frontend` and `backend` each carry a compose file in their own subdirectory and a stub at the root. `main` carries the final integration compose at the root. |

Anything that **must** exist at the root after the merge (e.g. the
final `docker-compose.yml`) lives on `devops` until the very last step.

## End-of-hackathon merge order

1. PR `backend` → `main`. Resolves `backend/` and `backend/docker-compose.yml`. No conflicts.
2. PR `frontend` → `main`. Resolves `bdn/` and root `docker-compose.yml` (frontend slice). No conflicts.
3. PR `devops` → `main`. Resolves `.github/`, `devops/`, and the **final root `docker-compose.yml`** (the integration compose). No conflicts.
4. After `main` absorbs `devops`, the root `docker-compose.yml` is the
   integration stack — postgres, backend, gateway, frontend, all wired
   with healthchecks and the real `BACKEND_URL=http://backend:8000`.

## Local dev per branch

- `frontend`: `cd bdn && docker compose -f ../docker-compose.yml up frontend` (or just `docker compose up frontend` from the repo root, which uses the frontend service only).
- `backend`: `docker compose -f backend/docker-compose.yml up`.
- `devops`: `docker compose -f devops/docker-compose.yml up` (full local stack).
- `main` (post-merge): `docker compose up`.