---
method: GET
path: /auth/discord/logout
summary: Logs out the current session.
link: true
---

Destroys the session tied to the `session` cookie (if any) and clears the cookie.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 200 OK

Returns a confirmation text string.
