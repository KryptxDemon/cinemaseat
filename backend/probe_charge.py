"""Quick probe: POST /charge to the gateway from a sibling container."""
import json, sys
import urllib.request

body = json.dumps({
    "amount": 12.5,
    "currency": "USD",
    "booking_ref": "docker-test-005",
    "callback_url": "http://localhost:9999/nope",
}).encode()
req = urllib.request.Request(
    "http://cinemaseat-gateway-1:9000/charge",
    data=body,
    method="POST",
    headers={"Content-Type": "application/json", "X-Mock-Mode": "random"},
)
try:
    r = urllib.request.urlopen(req, timeout=20)
    print(f"HTTP {r.status}: {r.read().decode()}")
except Exception as e:
    print(f"FAIL: {type(e).__name__}: {e}")