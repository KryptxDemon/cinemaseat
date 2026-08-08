"""Application settings, loaded via pydantic-settings.

Reads from environment variables and (optionally) a `.env` file.
Only values that change between local dev, Docker, and tests live here.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings.

    Field names are case-insensitive on input; env vars should be
    uppercase (e.g. ``DATABASE_URL``).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database -------------------------------------------------------
    database_url: str = Field(
        default="postgresql+psycopg://cinemaseat:cinemaseat@localhost:5432/cinemaseat",
        description="SQLAlchemy-compatible PostgreSQL DSN.",
    )

    # --- Booking rules --------------------------------------------------
    # How long a seat hold stays reserved before automatic release.
    # NOTE: This is a *runtime* value consumed by the hold service. It is
    # deliberately NOT a column on the `holds` table — `expires_at` is
    # computed at hold creation time as `now() + HOLD_TTL_SECONDS`.
    hold_ttl_seconds: int = Field(
        default=120,
        ge=1,
        description="Seconds a seat hold stays reserved.",
    )

    # --- Mock payment gateway -------------------------------------------
    # The asifmahmoud414/mock-gateway container running alongside the
    # backend. The backend POSTs /charge to this URL and the gateway
    # returns 202 synchronously, then fires an async callback to the
    # callback URL declared below.
    #
    # Both URLs are env-overridable so the same image can be pointed at
    # a staging gateway in CI without code changes.
    #
    # Default points at the container DNS name so that when this
    # backend runs as `cinemaseat-backend` on the `cinemaseat_default`
    # Docker network, /charge just works. Override to
    # http://localhost:8080 when running the backend on the host.
    mock_gateway_url: str = Field(
        default="http://cinemaseat-gateway-1:9000",
        description=(
            "Base URL of the mock payment gateway. The booking service "
            "POSTs {url}/charge to initiate a payment."
        ),
    )
    mock_gateway_callback_url: str = Field(
        default="http://cinemaseat-backend:8000/payments/callback",
        description=(
            "URL the gateway will POST to with the payment outcome. "
            "The callback handler is wired up in a later step; this "
            "value is just handed to the gateway at /charge time. "
            "Defaults to the backend container DNS name so the "
            "gateway can reach us from inside the compose network."
        ),
    )
    # Mock gateway returns 202 from /charge in ~10ms. We allow a wide
    # timeout because the gateway occasionally sleeps to simulate
    # network latency, but a real request should never hang.
    mock_gateway_timeout_seconds: float = Field(
        default=5.0,
        ge=0.1,
        description="HTTP client timeout for POST /charge.",
    )
    # Deterministic mode makes the gateway behave predictably — useful
    # for tests/CI. Set to "random" (or "") for the chaos mode.
    mock_gateway_mode: str = Field(
        default="deterministic",
        description=(
            "Value of the X-Mock-Mode header sent to the gateway. "
            "'deterministic' forces a predictable outcome; '' for chaos."
        ),
    )
    # The currency we quote the customer in. The gateway is flexible
    # but we always pass this through.
    default_currency: str = Field(
        default="USD",
        description="ISO 4217 currency code applied to every charge.",
    )

    # --- App ------------------------------------------------------------
    app_name: str = "CinemaSeat Backend"
    app_version: str = "0.1.0"
    environment: str = Field(default="development")


# A single, lazily-evaluated instance shared across the process.
settings = Settings()
