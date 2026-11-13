---
method: GET
path: /auth/discord/me
summary: Gets the currently logged in user.
link: true
---

Reads the `session` cookie and returns the associated user as a full user object. This always returns the full user object, even if the user has enabled anonymous mode.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 200 OK

Anonymous mode disabled:

```json
{
  "user": {
    "id": "435563387443740692",
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "echolotl",
    "displayName": "echolotl",
    "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c",
    "anonymous": false,
    "createdAt": 1783493609523,
    "updatedAt": 1783493609523
  }
}
```

Anonymous mode enabled:

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

### 204 No Content

Returns if not logged in.
