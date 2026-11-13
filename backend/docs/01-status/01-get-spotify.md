---
method: GET
path: /spotify
summary: Gets echolotl's current playing song on Spotify.
link: true
---

Gets echolotl's current playing song on Spotify.

## Rate Limit

15 requests over 1 minute

## Returns

### 200 OK

Returns the currently playing song on Spotify, if any.

#### Type

```typescript
type SpotifyResponse = {
  playing: boolean;
  title: string;
  href: string;
  durationMs: number;
  progressMs: number;
  artists: {
    name: string;
    href: string;
  }[];
  album: {
    name: string;
    href: string;
    imageUrl: string | null;
  };
};
```

#### Example

```json
{
  "playing": true,
  "title": "There's a Trick to It",
  "durationMs": 203520,
  "progressMs": 2913,
  "artists": [
    {
      "name": "Tee Lopes",
      "href": "https://api.spotify.com/v1/artists/5ZOKvzD4GQ7Yg2CS4CVbRb"
    }
  ],
  "album": {
    "name": "Denshattack! Bootleg EP",
    "href": "https://api.spotify.com/v1/albums/38UkCPW09YlAQGa70zrVx8",
    "imageUrl": "https://i.scdn.co/image/ab67616d0000b2736317dd36bba96d286d1a567f"
  }
}
```

### 204 No Content

Returns if echolotl is not currently playing anything on Spotify.
