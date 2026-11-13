---
method: PATCH
path: /auth/discord/me
summary: Toggles anonymous mode for the current user.
auth: discord
---

Requires an active `session` cookie. Can be used to set the anonymous mode for the current user, and returns a full user object with the updates. This is a non-anonymous object for the same reason as the `GET /auth/discord/me` endpoint.

## Body

```json
{
  "anonymous": true
}
```

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 200 OK

Returns the updated user.

```json
{
  "user": {
    "id": "435563387443740692",
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "echolotl",
    "displayName": "echolotl",
    "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c",
    "anonymous": true,
    "createdAt": 1783493609523,
    "updatedAt": 1783493609523
  }
}
```

### 401 Unauthorized

Returns if not logged in.

### 404 Not Found

Returns if the user no longer exists.
