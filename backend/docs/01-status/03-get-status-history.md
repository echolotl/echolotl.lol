---
method: GET
path: /status/history
summary: Gets recent status history.
link: true
---

Gets recent statuses, newest first.

## Query Parameters

`limit` (optional number): Number of statuses to return. Defaults to `10`.

`cursor` (optional number): The ID of the last status from the previous page, used for pagination.

## Rate Limit

15 requests over 2 minutes

## Returns

### 200 OK

Returns a list of statuses and the count returned.

#### Example

```json
{
  "total": 2,
  "statuses": [
    {
      "id": 1,
      "text": "coding",
      "emoji": "🧠",
      "createdAt": 1741553075123
    },
    {
      "id": 2,
      "text": "lunch",
      "emoji": null,
      "createdAt": 1741549075123
    }
  ]
}
```

### 204 No Content

Returns when no statuses are available.
