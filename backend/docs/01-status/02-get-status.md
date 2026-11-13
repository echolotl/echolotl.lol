---
method: GET
path: /status
summary: Gets echolotl's latest status.
link: true
---

Gets echolotl's latest status.

## Rate Limit

15 requests over 2 minutes

## Returns

### 200 OK

Returns the latest status object.

#### Example

```json
{
  "id": 2,
  "text": "sleepy",
  "emoji": "😴",
  "createdAt": 1741553075123
}
```

### 204 No Content

Returns when no status has been set yet. (Which probably means that the database got deleted. Whoops!)
