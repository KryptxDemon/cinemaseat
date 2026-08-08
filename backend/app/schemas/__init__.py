"""Pydantic schemas for the public API.

Re-exports every schema class so callers can ``from app.schemas import
MovieOut`` instead of reaching into the per-domain modules.
"""

from app.schemas.movie import MovieOut

__all__ = ["MovieOut"]
