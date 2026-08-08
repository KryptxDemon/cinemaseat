"""Gateway service — thin HTTP client for the mock payment provider.

This module wraps the mock-gateway's REST API so the booking service
never has to know the wire format. The contract is documented inline
in the source of the asifmahmoud414/mock-gateway image; the relevant
piece for Step 6 is ``POST /charge``:

    Request body (JSON):
        {
          "amount":        <number, > 0>,     # in major units (e.g. dollars)
          "currency":      <string>,          # ISO 4217, e.g. "USD"
          "booking_ref":   <string>,          # opaque reference from us
          "callback_url":  <absolute URL>     # where the outcome will POST
        }

    Response (202 Accepted):
        {
          "payment_id":   <string>,          # gateway-assigned id
          "status":       "PENDING"          # always; outcome arrives async
        }

The gateway will then asynchronously POST a JSON event to
``callback_url`` with the outcome (SUCCEEDED / FAILED), including an
``X-Signature`` header. That callback handler is **out of scope** for
Step 6 and lands in Step 7.

Why this layer exists at all
----------------------------
The booking service must remain HTTP-agnostic. Putting the gateway's
exact payload shape behind a ``charge()`` function means we can:

* Swap the mock for a real Stripe / Razorpay / SSLCommerz SDK later
  without touching ``booking_service.py``.
* Unit-test ``booking_service`` by patching ``gateway_service.charge``.
* Add retries, timeouts, and circuit-breakers in one place.

Design choice: fire-and-forget
------------------------------
``POST /payments`` must return ``202 {status: "pending"}`` *fast*. The
gateway itself answers in ~10ms, so a synchronous call is fine —
what we explicitly do NOT do is wait for the outcome callback. The
``charge()`` call here only confirms the gateway *accepted* the charge.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result + error types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class GatewayResult:
    """Outcome of a successful ``/charge`` round-trip.

    ``status`` here is always ``"PENDING"`` — that's what the gateway
    returns synchronously. The real payment status (succeeded/failed)
    arrives later via the callback webhook.
    """

    payment_id: str
    status: str
    raw: dict[str, Any]


class GatewayError(Exception):
    """Base class for gateway-side failures."""


class GatewayTransportError(GatewayError):
    """The gateway could not be reached, timed out, or returned 5xx."""


class GatewayRejectedError(GatewayError):
    """The gateway returned 4xx — our request was malformed or refused.

    Carries the gateway's error body for the caller to surface.
    """

    def __init__(self, status_code: int, body: dict[str, Any] | str) -> None:
        super().__init__(f"gateway rejected charge: HTTP {status_code} {body!r}")
        self.status_code = status_code
        self.body = body


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def charge(
    *,
    amount: float,
    currency: str,
    booking_ref: str,
    callback_url: str | None = None,
) -> GatewayResult:
    """Submit a charge to the mock gateway and return its payment_id.

    Parameters
    ----------
    amount:
        Charge amount in major units (e.g. 12.50 for $12.50).
    currency:
        ISO 4217 code — defaults to ``settings.default_currency``.
    booking_ref:
        Our reference for the charge. We use the hold id so the
        callback handler can find the matching Payment row by
        gateway_reference.
    callback_url:
        Absolute URL the gateway should POST the outcome to.
        Defaults to ``settings.mock_gateway_callback_url``.

    Returns
    -------
    GatewayResult
        ``payment_id`` is what we persist on ``payments.gateway_reference``.

    Raises
    ------
    GatewayTransportError
        Network failure, timeout, or 5xx response.
    GatewayRejectedError
        The gateway returned 4xx — request was bad.
    """
    url = f"{settings.mock_gateway_url.rstrip('/')}/charge"
    cb_url = callback_url or settings.mock_gateway_callback_url
    body: dict[str, Any] = {
        "amount": float(amount),
        "currency": currency,
        "booking_ref": str(booking_ref),
        "callback_url": cb_url,
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.mock_gateway_mode:
        # Deterministic mode makes tests reliable. Leave empty in
        # production for the gateway's real chaotic behaviour.
        headers["X-Mock-Mode"] = settings.mock_gateway_mode

    logger.info(
        "gateway.charge url=%s amount=%s currency=%s booking_ref=%s mode=%s",
        url,
        body["amount"],
        body["currency"],
        body["booking_ref"],
        settings.mock_gateway_mode or "random",
    )

    try:
        response = httpx.post(
            url,
            json=body,
            headers=headers,
            timeout=settings.mock_gateway_timeout_seconds,
        )
    except httpx.TimeoutException as exc:
        logger.warning("gateway.charge timeout url=%s err=%s", url, exc)
        raise GatewayTransportError(f"timeout calling gateway: {exc!s}") from exc
    except httpx.HTTPError as exc:
        # Covers ConnectError, NetworkError, RemoteProtocolError, ...
        logger.warning("gateway.charge transport error url=%s err=%s", url, exc)
        raise GatewayTransportError(f"gateway unreachable: {exc!s}") from exc

    # The gateway returns 202 on accept, 400 on validation, 500 on
    # simulated upstream failure. Anything else is unexpected.
    if response.status_code == 202:
        try:
            payload = response.json()
        except ValueError as exc:
            raise GatewayTransportError(
                f"gateway returned non-JSON 202 body: {response.text!r}"
            ) from exc
        if not isinstance(payload, dict) or "payment_id" not in payload:
            raise GatewayTransportError(
                f"gateway 202 missing payment_id: {payload!r}"
            )
        return GatewayResult(
            payment_id=str(payload["payment_id"]),
            status=str(payload.get("status", "PENDING")),
            raw=payload,
        )

    if 400 <= response.status_code < 500:
        try:
            err_body: Any = response.json()
        except ValueError:
            err_body = response.text
        logger.warning(
            "gateway.charge rejected status=%s body=%s",
            response.status_code,
            err_body,
        )
        raise GatewayRejectedError(response.status_code, err_body)

    # 5xx (or anything else unexpected) is a transport-level failure
    # from the caller's point of view — we'll let it retry later.
    logger.warning(
        "gateway.charge upstream error status=%s body=%s",
        response.status_code,
        response.text,
    )
    raise GatewayTransportError(
        f"gateway upstream error: HTTP {response.status_code} {response.text!r}"
    )