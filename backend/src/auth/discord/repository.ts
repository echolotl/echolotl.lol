import { db } from "../../db";
import type { Session, User } from "./model";
import { encrypt, decrypt } from "../../util/crypto";
import type { DeepBooleanToNumber, KeysToSnakeCase } from "../../util/types";

const insertSessionStmt = db.prepare(
  `INSERT INTO sessions (token, id, created_at, expires_at)
   VALUES ($1, $2, $3, $4)`,
);

const destroySessionStmt = db.prepare(`DELETE FROM sessions WHERE token = $1`);

const upsertUserStmt = db.prepare(`
  INSERT INTO users (id, user_id, username, display_name, avatar_hash, anonymous, should_sync, refresh_token, access_token, token_expires, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
  ON CONFLICT (id) DO UPDATE SET
    user_id = excluded.user_id,
    username = excluded.username,
    display_name = excluded.display_name,
    avatar_hash = excluded.avatar_hash,
    anonymous = excluded.anonymous,
    should_sync = excluded.should_sync,
    refresh_token = excluded.refresh_token,
    access_token = excluded.access_token,
    token_expires = excluded.token_expires,
    updated_at = $11`);

const deleteUserStmt = db.prepare(`DELETE FROM users WHERE id = $1`);

const getUserFromSessionQuery = db.query(`
  SELECT u.* FROM sessions s
  JOIN users u ON u.id = s.id
  WHERE s.token = $1 AND s.expires_at > $2
`);

const getUserByIdStmt = db.query(`SELECT * FROM users WHERE id = $1`);
const getUserByUserIdStmt = db.query(`SELECT * FROM users WHERE user_id = $1`);

type UserRow = DeepBooleanToNumber<KeysToSnakeCase<User>>;

/**
 * Converts a database user row to a User object.
 */
function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarHash: row.avatar_hash,
    anonymous: Boolean(row.anonymous),
    shouldSync: Boolean(row.should_sync),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    refreshToken: decrypt(row.refresh_token),
    accessToken: row.access_token
      ? decrypt(row.access_token)
      : row.access_token,
    tokenExpires: row.token_expires !== null ? Number(row.token_expires) : null,
  };
}

/**
 * Adds or updates a session in the database.
 */
export function upsertSession(session: Session): void {
  insertSessionStmt.run(
    session.token,
    session.id,
    session.createdAt,
    session.expiresAt,
  );
}

/**
 * Removes a session from the database.
 */
export function destroySession(token: string): void {
  destroySessionStmt.run(token);
}

/**
 * Creates or updates a user in the database.
 * @returns The newly created or updated user.
 */
export function upsertUser(user: Omit<User, "createdAt">): User {
  upsertUserStmt.run(
    user.id,
    user.userId,
    user.username,
    user.displayName,
    user.avatarHash,
    user.anonymous ? 1 : 0,
    user.shouldSync ? 1 : 0,
    encrypt(user.refreshToken),
    user.accessToken ? encrypt(user.accessToken) : null,
    user.tokenExpires,
    Date.now(),
  );
  return getUserById(user.id)!;
}

/**
 * Updates an existing user in the database.
 * @returns The updated user, or null if the user does not exist.
 */
export function updateUser(
  user: Pick<User, "id"> & Partial<Omit<User, "id" | "createdAt">>,
): User | null {
  const columns: Record<string, string | number | null | undefined> = {
    user_id: user.userId,
    username: user.username,
    display_name: user.displayName,
    avatar_hash: user.avatarHash,
    anonymous: user.anonymous === undefined ? undefined : +user.anonymous,
    should_sync: user.shouldSync === undefined ? undefined : +user.shouldSync,
    refresh_token:
      user.refreshToken === undefined ? undefined : encrypt(user.refreshToken),
    access_token: user.accessToken
      ? encrypt(user.accessToken)
      : user.accessToken,
    token_expires: user.tokenExpires,
  };

  const entries = Object.entries(columns).filter(([, value]) => value !== undefined);
  const sets = [...entries.map(([key]) => `${key} = ?`), "updated_at = ?"];
  const values = entries.map(([, value]) => value as string | number | null);

  db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values,
    Date.now(),
    user.id,
  );
  return getUserById(user.id);
}

/**
 * Deletes a user from the database.
 */
export function deleteUser(id: string): void {
  deleteUserStmt.run(id);
}

/**
 * Gets a user by their session token.
 */
export function userBySession(sessionToken: string | undefined): User | null {
  if (!sessionToken) return null;
  const rows = getUserFromSessionQuery.all(
    sessionToken,
    Date.now(),
  ) as UserRow[];

  const row = rows[0];
  if (!row) return null;

  return mapUserRow(row);
}

/**
 * Gets all active sessions for a given user ID.
 */
export function sessionsByUserId(userId: string): Session[] {
  const rows = db
    .query(`SELECT * FROM sessions WHERE id = $1 AND expires_at > $2`)
    .all(userId, Date.now()) as {
    token: string;
    id: string;
    created_at: number;
    expires_at: number;
  }[];

  return rows.map((row) => ({
    token: row.token,
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Gets a user by their ID.
 */
export function getUserById(id: string): User | null {
  const row = getUserByIdStmt.get(id) as UserRow | null;
  if (!row) return null;

  return mapUserRow(row);
}

/**
 * Gets a user by their public user ID.
 */
export function getUserByUserId(userId: string): User | null {
  const row = getUserByUserIdStmt.get(userId) as UserRow | null;
  if (!row) return null;

  return mapUserRow(row);
}
