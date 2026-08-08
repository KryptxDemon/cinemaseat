#!/usr/bin/env pwsh
# End-to-end booking flow through the SPA nginx proxy.
$ErrorActionPreference = 'Stop'

$base = 'http://localhost:3000/api'

Write-Host "=== 1. GET /shows ==="
$shows = curl.exe -sS "$base/shows" | ConvertFrom-Json
Write-Host "Got $($shows.Count) shows"
$show = $shows[0]
Write-Host "Using show id=$($show.id) hall=$($show.hallName) movie=$($show.movieId)"

Write-Host ""
Write-Host "=== 2. GET /shows/{id}/seats ==="
$seatMap = curl.exe -sS "$base/shows/$($show.id)/seats" | ConvertFrom-Json
Write-Host "Got $($seatMap.seats.Count) seats, available=$($seatMap.show.availableSeatsCount)"

# Pick two available seats (we use rowLabel+colLabel to find them)
$availSeats = $seatMap.seats | Where-Object { $_.status -eq 'available' } | Select-Object -First 2
$seat1 = $availSeats[0]
$seat2 = $availSeats[1]
Write-Host "Seats: $($seat1.id) (physical=$($seat1.seatId), $($seat1.rowLabel)$($seat1.colLabel)), $($seat2.id) (physical=$($seat2.seatId), $($seat2.rowLabel)$($seat2.colLabel))"

Write-Host ""
Write-Host "=== 3. POST /holds ==="
$body = "{""showId"":""$($show.id)"",""seatIds"":[""$($seat1.seatId)"",""$($seat2.seatId)""]}"
Write-Host "body=$body"
$holdJson = $body | curl.exe -sS -w "`nHTTP %{http_code}" -X POST -H "Content-Type: application/json" --data-binary "@-" "$base/holds"
Write-Host $holdJson
if ($holdJson -match 'HTTP 4') { exit 1 }
$hold = ($holdJson -split "`n")[0] | ConvertFrom-Json
Write-Host "holdId=$($hold.id) expires=$($hold.expiresAt) total=$$($hold.totalPriceUsd)"

Write-Host ""
Write-Host "=== 4. POST /payments ==="
$paymentBody = "{""holdId"":""$($hold.id)"",""name"":""Jane Doe"",""phone"":""+12025550100"",""email"":""jane@example.com"",""amountUSD"":$($hold.totalPriceUsd),""paymentMethod"":""card""}"
Write-Host "body=$paymentBody"
$payJson = $paymentBody | curl.exe -sS -w "`nHTTP %{http_code}" -X POST -H "Content-Type: application/json" --data-binary "@-" "$base/payments"
Write-Host $payJson

Write-Host ""
Write-Host "=== 5. DB state ==="
docker exec cinemaseat-db psql -U cinemaseat -d cinemaseat -c "SELECT count(*) AS holds FROM holds; SELECT count(*) AS hold_seats FROM hold_seats; SELECT count(*) AS bookings FROM bookings; SELECT count(*) AS payments FROM payments; SELECT status, count(*) FROM show_seats WHERE show_id='$($show.id)' GROUP BY status;"