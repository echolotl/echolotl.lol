---
method: POST
path: /status
summary: Sets a new status.
auth: admin
---

Creates a new status entry.

## Headers

Requires an `Authorization: Bearer <PASSKEY>` header, where `PASSKEY` matches the server's configured `PASSKEY` environment variable.

## Body

```json
{
  "text": "string (1-100 chars)",
  "emoji": "emoji (optional, nullable)"
}
```

## Rate Limit

15 requests over 2 minutes

## Returns

### 200 OK

Returns a confirmation text string with the new status.

### 401 Unauthorized

Missing or invalid `Authorization` bearer token.
