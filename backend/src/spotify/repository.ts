import { db } from "../db";
import type { SpotifyTokenRecord } from "./model";

const upsertSpotifyTokenStmt = db.prepare(
  `INSERT INTO spotify_token (id, access_token, expires_at)
   VALUES (1, ?, ?)
   ON CONFLICT(id)
   DO UPDATE SET access_token = excluded.access_token, expires_at = excluded.expires_at`,
);

const getSpotifyTokenStmt = db.prepare(
  `SELECT access_token, expires_at
   FROM spotify_token
   WHERE id = 1`,
);

/**
 * Stores or updates the stored Spotify token.
 * @param record The Spotify token.
 */
export function upsertSpotifyToken(record: SpotifyTokenRecord): void {
  upsertSpotifyTokenStmt.run(record.accessToken, record.expiresAt);
}

/**
 * Gets the stored Spotify token.
 * @returns The Spotify token record, or null if none exists.
 */
export function getSpotifyToken(): SpotifyTokenRecord | null {
  const row = getSpotifyTokenStmt.get() as {
    access_token: string;
    expires_at: number;
  } | null;

  if (!row) {
    return null;
  }

  return {
    accessToken: row.access_token,
    expiresAt: Number(row.expires_at),
  };
}
