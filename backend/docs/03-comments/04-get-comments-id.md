---
method: GET
path: /comments/:id
summary: Gets a single comment.
---

Returns a single comment by `id`, along with its `replyCount`. Fetch replies separately from `GET /comments/:id/replies`.

## Path Parameters

`id` (number): The comment's numeric ID.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 200 OK

Returns the comment.

#### Example

```json
{
      "id": 1,
      "slug": "test",
      "parentId": null,
      "body": "edit: thanks for a quarter of a million subscribers",
      "createdAt": 1783495142725,
      "editedAt": 1783496618566,
      "deletedAt": null,
      "author": {
        "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
        "username": "echolotl",
        "displayName": "echolotl",
        "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c"
      },
      "replyCount": 3
    }
```

### 400 Bad Request

Returns if `id` isn't an integer.

### 404 Not Found

Returns if no comment with that `id` exists.
