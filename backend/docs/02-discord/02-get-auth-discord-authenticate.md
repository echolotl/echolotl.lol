---
method: GET
path: /auth/discord/authenticate
summary: OAuth callback used by Discord.
---

This is the `redirect_uri` configured on the Discord application and it's not meant to be called directly. Discord redirects here with a `code` and `state` after the user approves the login.

This does more additional checks to ensure the Discord account is at least a month old (to mitigate spam), and then saves the Discord user info to the database and sets a `session` cookie for future authenticated requests.

## Query Parameters

`code` (string): Authorization code provided by Discord.  
 `state` (string): Must match the `oauth_state` cookie set in `/auth/discord/`.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 302 Found

Login succeeded. Redirects to the frontend with a `session` cookie set.

### 400 Bad Request

Missing or invalid query parameters.

### 403 Forbidden

The Discord account doesn't meet the minimum account age requirement.

### 502 Bad Gateway

Failed to reach Discord's token exchange or user info endpoints.
