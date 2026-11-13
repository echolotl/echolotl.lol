---
method: POST
path: /comments/s/:slug
summary: Posts a new top-level comment.
auth: discord
---

Requires an active `session` cookie. Creates a new top-level comment on the given `slug`.

## Path Parameters

`slug` (string): The identifier for the art piece being commented on.

## Body

Plain text body (`Content-Type: text/plain`), 1-5000 characters.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 201 Created

Returns the newly created comment.

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

### 401 Unauthorized

Returns if not logged in.
