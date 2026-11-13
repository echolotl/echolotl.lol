---
method: GET
path: /comments/s/:slug
summary: Gets top-level comments for a slug.
---

Returns the top-level (non-reply) comments for the given `slug`, oldest first. Each comment includes a `replyCount` so you can fetch replies separately from `GET /comments/:id/replies`.

## Path Parameters

`slug` (string): The slug of the art piece being commented on.

## Query Parameters

`limit` (optional number): Number of top-level comments to return. Defaults to `10`, capped at `50`.

`cursor` (optional number): The `id` of the last comment from the previous page. Pass the response's `nextCursor` to fetch the next page.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 200 OK

Returns the slug, a page of top-level comments, and a `nextCursor` (or `null` if there are no more pages).

#### Example

```json
{
  "slug": "test",
  "comments": [
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
  ],
  "nextCursor": null
}
```
