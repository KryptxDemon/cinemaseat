#!/bin/sh
for ep in / /pay /charge /create /payments /v1/pay /v1/charge /api/pay /api/charge; do
  echo "== $ep =="
  wget -qO- --timeout=3 \
    --post-data='{"amount":10,"reference":"x","callbackUrl":"http://example.com/cb","bookingId":"b"}' \
    --header='Content-Type: application/json' \
    "http://127.0.0.1:9000$ep"
  echo
done