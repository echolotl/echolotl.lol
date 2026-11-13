---
method: GET
path: /comments/:id/replies
summary: Gets replies to a comment.
---

Returns the direct replies to the comment `id`, oldest first. Each reply includes its own `replyCount`; fetch nested replies by calling this route again with the reply's own `id`.

## Path Parameters

`id` (number): The parent comment's ID.

## Query Parameters

`limit` (optional number): Number of replies to return. Defaults to `10`, capped at `50`.

`cursor` (optional number): The `id` of the last reply from the previous page. Pass the response's `nextCursor` to fetch the next page.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 200 OK

Returns the parent comment's `id`, a page of replies, and a `nextCursor` (or `null` if there are no more pages).

#### Example

```json
{
  "parentId": 42,
  "replies": [
    {
      "id": 4,
      "slug": "test",
      "parentId": 2,
      "body": "I hate this",
      "createdAt": 1783495142725,
      "editedAt": null,
      "deletedAt": null,
      "author": {
        "userId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "username": "anotheruser",
        "displayName": "Another User",
        "avatarHash": null
      },
      "replyCount": 0
    }
  ],
  "nextCursor": null
}
```

### 400 Bad Request

Returns if `id` isn't a valid integer.

### 404 Not Found

Returns if no comment with that `id` exists.
