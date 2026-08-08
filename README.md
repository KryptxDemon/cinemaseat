# CinemaSeat — devops branch

This branch owns Docker Compose, CI/CD, deployment, integration
testing, and load testing.

- Integration compose: [`devops/docker-compose.yml`](./devops/docker-compose.yml)
- CI: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
- Deploy: [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- Load test: [`devops/loadtest/run.sh`](./devops/loadtest/run.sh)

The final `README.md` for the project lives on `main` after merge.
See [`BRANCHES.md`](./BRANCHES.md).