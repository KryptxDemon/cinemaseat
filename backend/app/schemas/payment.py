"""Payment schemas — request to initiate a payment, response acknowledging it.

Phase 6 wires up ``POST /payments``. The contract is intentionally
narrow: the client sends the hold id and the customer's contact info,
the backend creates a Customer + Booking + Payment row, fires the
charge at the gateway **synchronously** (but only awaits the gateway's
``202 {status:"PENDING"}`` — not the outcome), and returns immediately
with ``{status: "pending"}``.

The actual confirmation / failure arrives later via the gateway's
async callback to ``POST /payments/callback`` (Step 7).
"""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from humps import camelize  # pyhumps, imported as `humps`
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Local import — EmailStr is provided by pydantic[email]; we use a
# permissive regex instead so the backend has zero extra runtime
# dependencies and a malformed email returns a clean 422.
# (pydantic[email] pulls in dnspython which we don't need for a demo.)
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PaymentCreateIn(BaseModel):
    """Payload for ``POST /payments``.

    All fields are required. ``holdId`` identifies the seat reservation
    being paid for; the customer triple identifies the buyer. We do
    NOT take any card data — the gateway integration is redirect-based
    in production and fully mock here.
    """

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    hold_id: UUID = Field(..., description="The hold being paid for.")
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=32)
    email: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Buyer email. Matched case-insensitively against existing customers.",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_str = v.strip()
        if not _EMAIL_RE.match(v_str):
            raise ValueError("invalid email address")
        return v_str

    def normalized_email(self) -> str:
        return self.email.strip().lower()


class PaymentInitiatedOut(BaseModel):
    """Response for ``POST /payments`` — 202 Accepted.

    The client should poll ``GET /bookings/{holdId}`` for confirmation
    once the gateway's callback flips the booking to ``confirmed``.
    """

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
        from_attributes=True,
    )

    status: str = Field(
        "pending",
        description="Always 'pending' on this endpoint — outcome arrives via callback.",
    )
    booking_id: UUID
    hold_id: UUID
    payment_id: UUID
    gateway_payment_id: str | None = Field(
        None,
        description="The gateway's own payment reference, returned in the 202 from /charge.",
    )
    amount: float
    currency: str
    customer_id: UUID
    created_at: datetime


class PaymentCallbackIn(BaseModel):
    """Payload sent by mock gateway to ``POST /payments/callback``.

    Accepts snake_case or camelCase keys (e.g. event_id / eventId, booking_ref / bookingRef).
    """

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    event_id: str = Field(..., description="Unique event identifier from gateway.")
    payment_id: str = Field(..., description="Gateway payment ID.")
    booking_ref: str = Field(..., description="Hold ID (UUID string) passed as booking_ref.")
    status: str = Field(..., description="Outcome: SUCCEEDED, FAILED, or REFUNDED.")
    amount: float = Field(..., description="Payment amount processed by gateway.")


class PaymentCallbackOut(BaseModel):
    """Response returned by ``POST /payments/callback``. Always HTTP 200."""

    model_config = ConfigDict(
        alias_generator=camelize,
        populate_by_name=True,
    )

    status: str = Field("ok", description="Always 'ok' for a valid callback.")
    message: str | None = Field(None, description="Optional detail message.")
