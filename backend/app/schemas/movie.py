"""Pydantic schemas for the ``movies`` domain.

Defined as ``from_attributes=True`` so they can be built directly from
SQLAlchemy ``Movie`` rows. Camel-case aliases match the SPA's ``Movie``
TypeScript contract (``posterUrl``, ``bannerUrl``, ``durationMinutes``).
"""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MovieOut(BaseModel):
    """Public representation of a movie."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    title: str
    description: str | None = None
    duration_minutes: int = Field(alias="durationMinutes")
    poster_url: str | None = Field(default=None, alias="posterUrl")
    banner_url: str | None = Field(default=None, alias="bannerUrl")