---
method: PATCH
path: /comments/:id
summary: Edits one of your own comments.
auth: discord
---

Requires an active `session` cookie. You can only edit your own comments, and only if they haven't been deleted.

## Path Parameters

`id` (number): The comment's numeric ID.

## Body

Plain text body (`Content-Type: text/plain`), 1-5000 characters.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 200 OK

Returns the updated comment.

#### Example

```json
{
  "id": 43,
  "slug": "my-art-piece",
  "parentId": 42,
  "body": "Edited: I actually love this and am not held at gunpoint!",
  "createdAt": 1783495142725,
  "editedAt": 1783496618566,
  "deletedAt": null,
  "author": {
    "userId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "username": "anotheruser",
    "displayName": "Another User",
    "avatarHash": null
  }
}
```

### 400 Bad Request

Returns if `id` isn't a valid integer.

### 401 Unauthorized

Returns if not logged in.

### 403 Forbidden

Returns if the comment isn't yours.

### 404 Not Found

Returns if no comment with that `id` exists.

### 410 Gone

Returns if the comment has already been deleted.
