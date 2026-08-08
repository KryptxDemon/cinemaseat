"""Mock payment gateway.

Replaces a real Stripe/Razorpay/etc. call for the demo. Returns
`success` or `failed` deterministically (we can swap to random later).
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4


@dataclass(frozen=True)
class GatewayResult:
    success: bool
    reference: str


def charge(card_token: str, amount: float) -> GatewayResult:
    """Pretend to charge a card. Always succeeds unless `card_token == "tok_decline`."""
    if card_token == "tok_decline":
        return GatewayResult(success=False, reference="")
    return GatewayResult(success=True, reference=f"mock_{uuid4().hex[:12]}")