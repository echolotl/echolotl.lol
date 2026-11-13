---
method: DELETE
path: /auth/discord/me
summary: Deletes the current user and their data.
auth: discord
---

Requires an active `session` cookie. This will delete the current user and all their data from the database.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 200 OK

Returns a confirmation text string.

### 401 Unauthorized

Returns if not logged in.

### 404 Not Found

Returns if the user doesn't exist.
