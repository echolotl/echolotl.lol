---
method: GET
path: /picross/:date
summary: Gets a daily Picross puzzle.
---

Returns the puzzle for the requested date. Use `today` for the current daily puzzle; dates are based on the `America/Chicago` time zone.

## Path Parameters

`date`: `today` or a calendar date in `YYYY-MM-DD` format, from `2026-10-18` through today.

## Rate Limit

100 requests over 1 minute.

## Returns

### 200 OK

The puzzle as `application/octet-stream`. The response has `Cache-Control: no-store`, an `X-Picross-Date` header with the resolved puzzle date, and an `X-Picross-Now` header with the server time in ISO 8601 format.

### 400 Bad Request

The date is not a valid calendar date in `YYYY-MM-DD` format.

### 404 Not Found

The date is before the first game date or after today.

### 503 Service Unavailable

The puzzle could not be loaded or generated.
