# CinemaSeat Hackathon — Context & Execution Plan

*A handoff document for continuing the project in another chat.*[cite: 3]

---

## 1. Project Context

The hackathon problem is to build a scalable, reliable movie ticketing platform that remains usable under pressure and never double-books the same seat[cite: 3].  

**Required core flow:** Browse movies/showtimes/theatres, live seat map, hold a seat, complete payment, confirm booking, automatically release abandoned holds, and integrate with the provided gateway[cite: 3].

* **Pre-population:** Pre-populate movies, theatres, showtimes, seat layouts, and prices[cite: 3]. Admin portals are **not** required[cite: 3].
* **Gateway:** The provided gateway must be used rather than mocked by the team[cite: 3].
* **Judging Priorities:** Seats/booking correctness, containers, testing, CI, deployment, and load-testing methodology[cite: 3]. A smaller system that never double-books is preferable to a larger system with a race condition[cite: 3].

---

## 2. Team & Responsibilities

| Person | Branch | Responsibility |
| :--- | :--- | :--- |
| **You** | `devops` | Docker Compose, CI/CD, deployment, integration, load testing, DevOps documentation[cite: 3] |
| **Friend 1** | `frontend` | React frontend and user booking flow[cite: 3] |
| **Friend 2** | `backend` | FastAPI, PostgreSQL, SQLAlchemy, concurrency-safe seat holds, payment callbacks[cite: 3] |

---

## 3. GitHub Setup Already Completed

* **Repository:** `https://github.com/KryptxDemon/cinemaseat`[cite: 3]
* **Current Status:** Repository initial commit exists, `main` is pushed[cite: 3].
* **Created Branches:** `main`, `backend`, `frontend`, `devops`[cite: 3].
* **Workflow Rule:** You are working on `devops`[cite: 3]. Do not mix branches unnecessarily[cite: 3]. Each teammate works on their own branch; changes will later be integrated through `main`/PRs[cite: 3].

---

## 4. Current Files / Initial Repository

* `README.md`[cite: 3]
* `DECISIONS.md`[cite: 3]
* `docker-compose.yml`[cite: 3]
* `.gitignore` (planned/created on `devops` branch to ignore `.env`, Python caches/virtual environments, `node_modules`, `dist`, IDE files, etc.)[cite: 3]. **Do not commit real secrets**[cite: 3].

---

## 5. Docker Status — Already Done

**Installed Versions:**
* Docker version: `29.6.2`[cite: 3]
* Docker Compose version: `v5.3.1`[cite: 3]
* Docker Desktop running, `docker compose` verified working[cite: 3].

**Current Infrastructure Target (`docker-compose.yml`):**
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: cinemaseat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d cinemaseat"]
      interval: 5s
      timeout: 5s
      retries: 5

  gateway:
    image: asifmahmoud414/mock-gateway:latest
    ports:
      - "9000:9000"

volumes:
  postgres_data:
```[cite: 3]

* **Gateway Requirement:** Mandated image `asifmahmoud414/mock-gateway:latest` exposed on port `9000`[cite: 3]. Must **not** be replaced by a custom mock[cite: 3].
* **Gateway Endpoints:** `POST /charge`, `POST /refund`, `POST /otp/send`, `POST /otp/verify`, `GET /health`[cite: 3]. The gateway returns pending payments and calls the supplied callback later; callbacks can be delayed, failed, duplicated, or otherwise misbehave[cite: 3].

---

## 6. Planned Final Docker Architecture

```text
docker compose up
        |
  +-----+--------+-----------+
  |     |        |           |
 React FastAPI PostgreSQL Gateway
  |       |                    |
  +-------+--------------------+
          API / payment flow
```[cite: 3]

**Inside Docker:**
* `FastAPI` $\rightarrow$ `postgres:5432`[cite: 3]
* `FastAPI` $\rightarrow$ `http://gateway:9000`[cite: 3]
* **Rule:** Do **NOT** use `localhost` for container-to-container communication[cite: 3].

---

## 7. Frontend Status

* **Builder:** Friend 1 using Google AI Studio[cite: 3].
* **Stack:** React + TypeScript + Vite + Tailwind[cite: 3].
* **Required Flow:** Movies $\rightarrow$ Showtimes $\rightarrow$ Seat Map $\rightarrow$ Select seat $\rightarrow$ Hold seat $\rightarrow$ Payment $\rightarrow$ Confirmation[cite: 3].
* **Seat States:** Must distinguish `AVAILABLE`, `SELECTED`, `HELD`, and `BOOKED`[cite: 3]. Selecting a seat locally must **not** imply that the backend successfully held it[cite: 3].
* **Architecture:** Call a clean API layer rather than embedding fetch calls throughout UI components[cite: 3].

**Recommended Structure:**
```text
src/
  api/
    client.ts
    movies.ts
    shows.ts
    seats.ts
    bookings.ts
    payments.ts
  components/
  pages/
  types/
  App.tsx
  main.tsx
```[cite: 3]

---

## 8. Backend Status / Instructions

Friend 2 builds FastAPI + PostgreSQL + SQLAlchemy independently on `backend`[cite: 3].

**Core Endpoints:**
* `GET /health`[cite: 3]
* `GET /movies`[cite: 3]
* `GET /shows/{show_id}/seats`[cite: 3]
* `POST /holds`[cite: 3]
* `POST /payments`[cite: 3]
* `POST /payments/callback`[cite: 3]
* `GET /bookings/{booking_id}`[cite: 3]

**Concurrency Rule (`POST /holds`):**
Must be database-backed and concurrency-safe: **100 simultaneous requests for the exact same seat must produce exactly 1 successful hold and zero oversell**[cite: 3]. Do **not** solve concurrency using an in-memory Python variable/global lock; use the database as the source of truth[cite: 3].

---

## 9. Recommended Database Design

| Table | Important Columns | Key Constraints / Purpose |
| :--- | :--- | :--- |
| `movies` | `id`, `title`, `description`, `duration_minutes` | Movie catalogue[cite: 3] |
| `theatres` | `id`, `name`, `location` | Physical cinema halls[cite: 3] |
| `seats` | `id`, `theatre_id`, `seat_number`, `row_label` | Physical seats; `UNIQUE(theatre_id, seat_number)`[cite: 3] |
| `shows` | `id`, `movie_id`, `theatre_id`, `starts_at`, `price` | A movie showing in a theatre[cite: 3] |
| `holds` | `id`, `show_id`, `seat_id`, `hold_token`, `status`, `expires_at`, `created_at` | Temporary ownership; critical concurrency table[cite: 3] |
| `bookings` | `id`, `booking_ref`, `show_id`, `seat_id`, `hold_id`, `status`, `amount`, `created_at` | Confirmed/cancelled reservation[cite: 3] |
| `payments` | `id`, `booking_id`, `gateway_payment_id`, `event_id`, `status`, `amount`, `created_at`, `updated_at` | Payment state and callback idempotency[cite: 3] |

**Relationships:**
* `Movie` $1:N$ `Show`[cite: 3]
* `Theatre` $1:N$ `Show`[cite: 3]
* `Theatre` $1:N$ `Seat`[cite: 3]
* `Show` $1:N$ `Hold`[cite: 3]
* `Show` $1:N$ `Booking`[cite: 3]
* `Hold` $1:0..1$ `Booking`[cite: 3]
* `Booking` $1:N$ `Payment`[cite: 3]
* `Seat` $1:N$ `Hold` over its lifetime[cite: 3]
* `Seat` $1:N$ `Booking` over its lifetime[cite: 3]

> **Important:** Seat availability is **show-specific**[cite: 3]. Do not put a single global `HELD`/`BOOKED` status on the physical `seats` table[cite: 3].
>
> **Suggested Uniqueness Constraints:** `UNIQUE(theatre_id, seat_number)`, `UNIQUE(show_id, seat_id)` for active ownership strategy, `UNIQUE(booking_ref)`, `UNIQUE(gateway_payment_id)`, `UNIQUE(event_id)`[cite: 3].

---

## 10. Hold and Payment State Logic

### Seat Lifecycle
```text
AVAILABLE
   |
   v
 HELD
   |    |  \ payment fails / TTL expires
   |    |    v
   |  AVAILABLE
   |
   v
CONFIRMED / BOOKED
```[cite: 3]

### Payment & Callback Idempotency
```text
POST /payments
      |
      v
   PENDING
      |
   gateway callback
      |
  +---+---------+
  |             |
SUCCEEDED      FAILED
  |             |
  v             v
CONFIRMED     release/cancel
```[cite: 3]

* **Duplicate Callback Handling:** If `same event_id` $\rightarrow$ already processed $\rightarrow$ safely return `200` $\rightarrow$ no duplicate booking/payment/revenue[cite: 3].
* **Asynchronous Design:** Gateway callback can be delayed 2–15 seconds, fail payments, deliver duplicate callbacks, or time out on `/charge`[cite: 3]. The `/pay` handler must **not** wait synchronously for the gateway[cite: 3].

---

## 11. Environment Variables

```bash
POSTGRES_DB=cinemaseat
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

HOLD_TTL_SECONDS=60
GATEWAY_URL=http://gateway:9000
```[cite: 3]

> **Constraint:** `HOLD_TTL_SECONDS` must be configurable from the environment so judges can test abandoned holds with short TTL values[cite: 3].

---

## 12. DevOps Roadmap — Your Remaining Work

| Order | Task | Status |
| :---: | :--- | :--- |
| **1** | Git repo + branches | **DONE**[cite: 3] |
| **2** | Docker Desktop / Compose working | **DONE**[cite: 3] |
| **3** | PostgreSQL + provided gateway in Compose | **DONE** / verify committed[cite: 3] |
| **4** | `.gitignore` + `.env.example` | **DO** / verify[cite: 3] |
| **5** | Integrate backend Dockerfile into Compose | **NEXT** after backend arrives[cite: 3] |
| **6** | Integrate frontend Dockerfile into Compose | After frontend arrives[cite: 3] |
| **7** | `docker compose up` from clean clone | **MUST PASS**[cite: 3] |
| **8** | CI on PR/push: tests + build | **NEXT**[cite: 3] |
| **9** | Deployment | Required[cite: 3] |
| **10** | Load test same-seat hold | Required[cite: 3] |
| **11** | Abandoned hold test | Required[cite: 3] |
| **12** | Fault isolation / observability / Nginx / AWS | Bonus only if core is solid[cite: 3] |

---

## 13. CI/CD Plan

```text
Pull Request / push
        |
        +--> backend tests
        +--> frontend build
        +--> Docker build
        |
       PASS
        |
     merge main
```[cite: 3]

* **Deployment Flow:** `main` branch push $\rightarrow$ build images $\rightarrow$ deploy $\rightarrow$ verify `/health`[cite: 3].

---

## 14. Required Tests / Demo Scenarios

1. **Scenario A — Same-Seat Concurrency:** Send 100 concurrent hold requests for the exact same show + seat[cite: 3]. Expected: **1 success, 99 rejections, 0 oversell**[cite: 3].
2. **Scenario B — Abandoned Hold:** Hold a seat without paying, wait for `HOLD_TTL_SECONDS` to expire, and verify the seat becomes available again for another user to book[cite: 3].
3. **Scenario C — Bonus Breakpoint:** Ramp virtual users on seat map/hold endpoints, report p95 latency and errors, and explain the bottleneck[cite: 3].
4. **Testing Rule:** Run load generation from your laptop/host or external machine—**never on the same CPU resources hosting the app**[cite: 3].

---

## 15. README / Documentation Deliverables

* **`README.md`:** Overview of what was built, status, architecture diagram, instructions to run locally from clone (`docker compose up`), deployed URL, and exact request payloads for holding a seat and fetching a seat map[cite: 3].
* **`DECISIONS.md`:** Document 3 genuine engineering trade-offs/arguments (options considered, choice made, rationale, and sacrifices)[cite: 3].

---

## 16. Important "Do Not Waste Time" Rules

* ❌ Do **not** build an admin portal[cite: 3].
* ❌ Do **not** build a full authentication/user system unless everything else is complete[cite: 3].
* ❌ Do **not** create your own mock payment gateway[cite: 3].
* ❌ Do **not** add Kubernetes, Terraform, Redis, Jenkins, or microservice bloat unnecessarily[cite: 3].
* ❌ Do **not** over-polish the frontend UI (no extra marks for visual polish)[cite: 3].
* ❌ Do **not** merge unfinished work into `main`[cite: 3].
* ❌ Do **not** hardcode `HOLD_TTL_SECONDS`[cite: 3].
* ❌ Do **not** use `localhost` for service-to-service communication inside Compose[cite: 3].
* ❌ Do **not** solve seat concurrency with in-memory application state[cite: 3].
* ❌ Do **not** make payment callback processing non-idempotent[cite: 3].

---

## 17. Immediate Next Actions

### YOU (`devops`)
1. Verify/commit `.gitignore` and `.env.example`[cite: 3].
2. Keep working on `devops` branch[cite: 3].
3. Wait for `backend` branch to reach a working FastAPI/PostgreSQL state[cite: 3].
4. Integrate backend into Docker Compose[cite: 3].
5. Integrate frontend into Docker Compose[cite: 3].
6. Set up GitHub Actions CI[cite: 3].
7. Deploy application[cite: 3].
8. Run concurrency + abandoned-hold tests[cite: 3].
9. Document test results and evidence[cite: 3].

### FRONTEND
1. Push `frontend` branch[cite: 3].
2. Keep API client layer modular[cite: 3].
3. Ensure local UI selection does not equal held state until API confirms[cite: 3].
4. Complete full booking flow[cite: 3].

### BACKEND
1. Implement FastAPI + PostgreSQL + SQLAlchemy[cite: 3].
2. Create models, migrations, and seed data[cite: 3].
3. Build `/health`, `/movies`, `/shows/{id}/seats`[cite: 3].
4. Implement concurrency-safe `/holds`[cite: 3].
5. Implement TTL auto-release[cite: 3].
6. Implement payment callback handling with idempotency[cite: 3].
7. Write unit/integration tests[cite: 3].