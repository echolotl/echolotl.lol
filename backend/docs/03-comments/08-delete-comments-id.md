---
method: DELETE
path: /comments/:id
summary: Deletes one of your own comments.
auth: discord
---

Requires an active `session` cookie. You can only delete your own comments. The comment's body is replaced with `[deleted]` rather than being removed entirely, so replies stay intact.

## Path Parameters

`id` (number): The comment's numeric ID.

## Rate Limit

100 requests over 1 minute, shared across all comment routes

## Returns

### 204 No Content

Comment deleted successfully (or was already deleted).

### 400 Bad Request

Returns if `id` isn't a valid integer.

### 401 Unauthorized

Returns if not logged in.

### 403 Forbidden

Returns if the comment isn't yours.

### 404 Not Found

Returns if no comment with that `id` exists.
