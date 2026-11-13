---
method: GET
path: /comments/user/:userId
summary: Gets a user's recent comments.
---

Returns the user's public profile along with their most recent comments, newest first. Comments don't include author info here since it's the same user for all of them.

## Path Parameters

`userId` (string): The user's standalone `userId`.

## Query Parameters

`limit` (optional number): Number of comments to return. Defaults to `10`.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 200 OK

Returns the user and their comments.

#### Example

```json
{
  "user": {
    "userId": "96fb88e3-7d86-4952-bf33-a39be79bbe47",
    "username": "echolotl",
    "displayName": "echolotl",
    "avatarHash": "b4f0fe2766aa2ff7ea8a41af44fc832c"
  },
  "comments": [
    {
      "id": 2,
      "slug": "test",
      "parentId": 1,
      "body": "hi bro",
      "createdAt": 1783495535264,
      "editedAt": null,
      "deletedAt": null
    },
    {
      "id": 1,
      "slug": "test",
      "parentId": null,
      "body": "edit: thanks for a quarter of a million subscribers",
      "createdAt": 1783495142725,
      "editedAt": 1783496618566,
      "deletedAt": null
    }
  ]
}
```

### 404 Not Found

Returns if no user has that `userId`.
