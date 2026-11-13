---
method: GET
path: /auth/discord/
summary: Starts the Discord login flow.
link: true
---

Redirects the browser to Discord's OAuth consent screen. Sets a short-lived `oauth_state` cookie for validation.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 302 Found

Redirects to Discord's OAuth authorize page.
