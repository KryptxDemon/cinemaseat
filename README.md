# CinemaSeat — backend branch

This branch implements the FastAPI booking service and the
containerised demo stack. From a clean clone:

```bash
cp .env.example .env
docker compose up --build
```

That single command brings up Postgres, the FastAPI backend, the
provided mock payment gateway, and the React frontend — all on one
Docker network. See [`backend/README.md`](./backend/README.md) for
endpoint docs and [`BRANCHES.md`](./BRANCHES.md) for branch ownership.

The root `README.md` is finalized on the `main` branch after the
last PR is merged.

## CI / CD

Two GitHub Actions workflows live in `.github/workflows/`:

- `ci.yml` — runs the FastAPI test suite and Alembic dry-run on every push
  and PR.
- `cd.yml` — triggered by a successful CI run on `main` (via `workflow_run`).
  Builds the existing `backend/Dockerfile` and pushes two tags to Docker
  Hub:
    - `<DOCKERHUB_USERNAME>/cinemaseat-backend:latest`
    - `<DOCKERHUB_USERNAME>/cinemaseat-backend:<commit-sha>`

  The CD pipeline only **builds and publishes** the image. Deployment
  (manual or otherwise) is out of scope.

### Required repository secrets for CD

| Secret             | Purpose                                            |
|--------------------|----------------------------------------------------|
| `DOCKERHUB_USERNAME` | Docker Hub account that owns the image repo     |
| `DOCKERHUB_TOKEN`    | Docker Hub access token (not the account password) |

Optional repository variable:

| Variable          | Purpose                                          |
|-------------------|--------------------------------------------------|
| `DOCKERHUB_REPO`  | Image repo name (defaults to `cinemaseat-backend`) |