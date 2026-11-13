---
method: GET
path: /auth/discord/user/:userId
summary: Looks up a user by their (non-Discord) user ID.
---

Returns a user object for the given `userId`. If the user has enabled anonymous mode, this will return a redacted user object with a generic username and display name, and no avatar hash.

## Path Parameters

`userId` (string): The user's `userId`, as returned by `/auth/discord/me` or itself.

## Rate Limit

20 requests over 1 minute, shared across all Discord auth routes

## Returns

### 200 OK

Anonymous mode disabled:

```json
{
  "user": {
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "echolotl",
    "displayName": "echolotl",
    "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c"
  }
}
```

Anonymous mode enabled:

```json
{
  "user": {
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "anonymous96fb",
    "displayName": "Anonymous",
    "avatarHash": null
  }
}
```

### 404 Not Found

Returns if no user has that `userId`.
