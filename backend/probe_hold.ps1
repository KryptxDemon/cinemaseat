#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
$showId = '23868629-38d7-4118-acd5-aa6f6b98968c'

$seats = (curl.exe -sS "http://localhost:3000/api/shows/$showId/seats" | ConvertFrom-Json).seats
$s1 = $seats[0].id
$s2 = $seats[1].id
Write-Host "showId=$showId"
Write-Host "seats=$s1 , $s2"

$body = "{""showId"":""$showId"",""seatIds"":[""$s1"",""$s2""]}"
Write-Host "body=$body"

Write-Host "=== POST /api/holds ==="
$body | curl.exe -sS -w "`nHTTP %{http_code}" -X POST `
  -H "Content-Type: application/json" `
  --data-binary "@-" `
  "http://localhost:3000/api/holds"
