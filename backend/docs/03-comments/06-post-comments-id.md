---
method: POST
path: /comments/:id
summary: Posts a reply to a comment.
auth: discord
---

Requires an active `session` cookie. Creates a reply to the comment `id`, inheriting its slug.

## Path Parameters

`id` (number): The parent comment's numeric ID.

## Body

Plain text body (`Content-Type: text/plain`), 1-5000 characters.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 201 Created

Returns the newly created reply.

#### Example

```json
{
  "id": 2,
  "slug": "test",
  "parentId": null,
  "body": "wow",
  "createdAt": 1783495142725,
  "editedAt": null,
  "deletedAt": null,
  "author": {
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "echolotl",
    "displayName": "echolotl",
    "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c"
  }
}
```

### 400 Bad Request

Returns if `id` isn't an integer.

### 401 Unauthorized

Returns if not logged in.

### 404 Not Found

Returns if no parent comment with that `id` exists.
