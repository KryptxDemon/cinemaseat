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

    # --- App ------------------------------------------------------------
    app_name: str = "CinemaSeat Backend"
    app_version: str = "0.1.0"
    environment: str = Field(default="development")


# A single, lazily-evaluated instance shared across the process.
settings = Settings()
