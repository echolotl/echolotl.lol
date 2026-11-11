import { Database } from "bun:sqlite";
import type { Status } from "@echolotl/types";
import type { SpotifyTokenRecord } from "./spotify/model";
import { Session, User } from "./auth/discord/model";
import { Comment } from "./comments/model";
import { encrypt, decrypt } from "./util/crypto";
const dbPath = () => {
  const devEnv = process.env.NODE_ENV === "development";
  const defaultPath = devEnv ? "./data/dev.db" : "./data/main.db";
  return process.env.DB_PATH ?? defaultPath;
};
const db = new Database(dbPath());

// init
db.run(`
  CREATE TABLE IF NOT EXISTS spotify_token (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

	CREATE TABLE IF NOT EXISTS statuses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text TEXT NOT NULL,
		emoji TEXT,
		created_at INTEGER NOT NULL
	);

	-- Discord OAuth users
	CREATE TABLE IF NOT EXISTS users (
	  id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
		username TEXT NOT NULL,
		display_name TEXT,
		avatar_hash TEXT,
    anonymous INTEGER NOT NULL DEFAULT 0,
    should_sync INTEGER NOT NULL DEFAULT 1,
		created_at BIGINT NOT NULL,
		updated_at BIGINT NOT NULL,

		-- Token stuff
		refresh_token TEXT NOT NULL,
		access_token TEXT,
		token_expires BIGINT
	);

	CREATE TABLE IF NOT EXISTS sessions (
	  token TEXT PRIMARY KEY,
		id TEXT NOT NULL REFERENCES users(id),
		created_at BIGINT NOT NULL,
		expires_at BIGINT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(id);

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    slug TEXT NOT NULL, -- the slug of the item the comment is associated with
    parent_id INTEGER REFERENCES comments(id),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    edited_at INTEGER,
    deleted_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug);
  CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
`);

// #region MIGRATION STATEMENTS
// Add `user_id` and `anonymous` columns to `users` table if they don't exist
const userTableColumns = db.query(`PRAGMA table_info(users)`).all() as {
  name: string;
}[];

if (!userTableColumns.some((column) => column.name === "user_id")) {
  db.run(`ALTER TABLE users ADD COLUMN user_id TEXT`);
}

if (!userTableColumns.some((column) => column.name === "anonymous")) {
  db.run(`ALTER TABLE users ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0`);
}

// Add `should_sync` column to `users` table if it doesn't exist
if (!userTableColumns.some((column) => column.name === "should_sync")) {
  db.run(`ALTER TABLE users ADD COLUMN should_sync INTEGER NOT NULL DEFAULT 1`);
}
// #endregion

db.run(`UPDATE users SET user_id = id WHERE user_id IS NULL OR user_id = ''`);
db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`);

// #region STATEMENTS
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

const getLatestStatusStmt = db.prepare(
  `SELECT id, text, emoji, created_at
	 FROM statuses
	 ORDER BY id DESC
	 LIMIT 1`,
);

const getStatusesLimitStmt = db.prepare(
  `SELECT id, text, emoji, created_at
	 FROM statuses
	 ORDER BY id DESC
	 LIMIT ?`,
);

const getStatusesLimitCursorStmt = db.prepare(
  `SELECT id, text, emoji, created_at
	 FROM statuses
	 WHERE id < ?
	 ORDER BY id DESC
	 LIMIT ?`,
);

const insertStatusStmt = db.prepare(
  `INSERT INTO statuses (text, emoji, created_at)
	 VALUES (?, ?, ?)`,
);

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

const insertCommentStmt = db.prepare(
  `INSERT INTO comments (user_id, slug, parent_id, body, created_at, edited_at, deleted_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
);

const getTopLevelCommentsBySlugStmt = db.prepare(
  `SELECT * FROM comments WHERE slug = $1 AND parent_id IS NULL ORDER BY id DESC LIMIT $2`,
);

const getTopLevelCommentsBySlugCursorStmt = db.prepare(
  `SELECT * FROM comments WHERE slug = $1 AND parent_id IS NULL AND id < $2 ORDER BY id DESC LIMIT $3`,
);

const getCommentsByUserIdStmt = db.prepare(
  `SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC`,
);

const getCommentsByUserIdLimitStmt = db.prepare(
  `SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
);

const getCommentByIdStmt = db.prepare(`SELECT * FROM comments WHERE id = $1`);

const getCommentsByParentIdStmt = db.prepare(
  `SELECT * FROM comments WHERE parent_id = $1 ORDER BY id ASC LIMIT $2`,
);

const getCommentsByParentIdCursorStmt = db.prepare(
  `SELECT * FROM comments WHERE parent_id = $1 AND id > $2 ORDER BY id ASC LIMIT $3`,
);

const editCommentStmt = db.prepare(
  `UPDATE comments SET body = $1, edited_at = $2 WHERE id = $3 AND deleted_at IS NULL`,
);

const deleteCommentStmt = db.prepare(
  `UPDATE comments SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`,
);
// #endregion

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

/**
 * Gets the latest status.
 * @returns The latest status record, or null if none exists.
 */
export function getLatestStatus(): Status | null {
  const row = getLatestStatusStmt.get() as {
    id: number;
    text: string;
    emoji: string | null;
    created_at: number;
  } | null;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    text: row.text,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

/**
 * Gets a certain amount of statuses.
 * @param limit The maximum number of status records to retrieve.
 * @param cursor The ID of the status record to start from.
 * @returns An array of status records.
 */
export function getStatusesLimit(limit: number, cursor?: number): Status[] {
  const rows = (
    cursor === undefined
      ? getStatusesLimitStmt.all(limit)
      : getStatusesLimitCursorStmt.all(cursor, limit)
  ) as {
    id: number;
    text: string;
    emoji: string | null;
    created_at: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    emoji: row.emoji,
    createdAt: row.created_at,
  }));
}

/**
 * Adds a new status to the database.
 * @param status The status to add.
 * @returns The newly added status, including its ID and creation timestamp.
 */
export function insertStatus(status: Omit<Status, "id" | "createdAt">): Status {
  const createdAt = Date.now();
  insertStatusStmt.run(status.text, status.emoji, createdAt);

  const row = db.query(`SELECT last_insert_rowid() AS id`).get() as {
    id: number;
  };

  return {
    ...status,
    id: row.id,
    createdAt,
  };
}

/**
 * Adds or updates a session in the database.
 * @param session The session to upsert into the database.
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
 * @param token The token of the session to destroy.
 */
export function destroySession(token: string): void {
  destroySessionStmt.run(token);
}

/**
 * Creates or updates a user in the database.
 * @param user The user to create or update.
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
 * Different than {@link upsertUser}, it doesn't need a complete user beforehand.
 * @param user The user to update.
 * @returns The updated user, or null if the user does not exist.
 */
export function updateUser(
  user: Pick<User, "id"> & Partial<Omit<User, "id" | "createdAt">>,
): User | null {
  // We have to do some processing on some fields
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

  const entries = Object.entries(columns).filter(([, v]) => v !== undefined);
  const sets = [...entries.map(([k]) => `${k} = ?`), "updated_at = ?"];
  const values = entries.map(([, v]) => v as string | number | null);

  db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values,
    Date.now(),
    user.id,
  );
  return getUserById(user.id);
}

/**
 * Deletes a user from the database.
 * @param id The ID of the user to delete.
 */
export function deleteUser(id: string) {
  deleteUserStmt.run(id);
}

/**
 * What the database actually returns for a user row.
 * (booleans are numbers)
 */
type UserRow = DeepBooleanToNumber<KeysToSnakeCase<User>>;
/**
 * What the database actually returns for a comment row.
 */
type CommentRow = KeysToSnakeCase<Comment>;

/**
 * Converts a database user row to a User object.
 * @param row The database row representing a user.
 * @returns The corresponding User object.
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
 * Converts a database comment row to a Comment object.
 * @param row The database row representing a comment.
 * @returns The corresponding Comment object.
 */
function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Gets a user by their session token.
 * @param sessionToken The session token to look up the user by.
 * @returns The corresponding User object, or null if no user is found.
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
 * Gets all sessions for a given user ID.
 * @param userId The ID of the user to look up sessions for.
 * @returns An array of Session objects associated with the user.
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
 * @param id The ID of the user to look up.
 * @returns The corresponding User object, or null if no user is found.
 */
export function getUserById(id: string): User | null {
  const row = getUserByIdStmt.get(id) as UserRow | null;
  if (!row) return null;

  return mapUserRow(row);
}

/**
 * Gets a user by their user ID.
 * @param userId The user ID to look up.
 * @returns The corresponding User object, or null if no user is found.
 */
export function getUserByUserId(userId: string): User | null {
  const row = getUserByUserIdStmt.get(userId) as UserRow | null;
  if (!row) return null;

  return mapUserRow(row);
}

/**
 * Gets a comment by its ID.
 * @param id The ID of the comment to look up.
 * @returns The corresponding Comment object, or null if no comment is found.
 */
export function getCommentById(id: number) {
  const row = getCommentByIdStmt.get(id) as CommentRow | undefined;
  if (!row) return null;
  return mapCommentRow(row);
}

/**
 * Gets the top-level comments for a given slug.
 * @param slug The slug to look up comments for.
 * @param limit The maximum number of comments to return.
 * @param cursor The ID of the comment to start the pagination from (optional).
 * @returns An array of Comment objects.
 */
export function getTopLevelCommentsBySlug(
  slug: string,
  limit: number,
  cursor?: number,
) {
  const rows =
    typeof cursor === "number"
      ? (getTopLevelCommentsBySlugCursorStmt.all(
          slug,
          cursor,
          limit,
        ) as CommentRow[])
      : (getTopLevelCommentsBySlugStmt.all(slug, limit) as CommentRow[]);
  return rows.map(mapCommentRow);
}

/**
 * Gets comments made by a specific user.
 * @param userId The ID of the user to look up comments for.
 * @param limit The maximum number of comments to return (optional).
 * @returns An array of Comment objects.
 */
export function getCommentsByUserId(userId: string, limit?: number) {
  const rows =
    typeof limit === "number"
      ? (getCommentsByUserIdLimitStmt.all(userId, limit) as CommentRow[])
      : (getCommentsByUserIdStmt.all(userId) as CommentRow[]);
  return rows.map(mapCommentRow);
}

/**
 * Gets comments that are replies to a specific parent comment.
 * @param parentId The ID of the parent comment.
 * @param limit The maximum number of comments to return.
 * @param cursor The ID of the comment to start the pagination from (optional).
 * @returns An array of Comment objects.
 */
export function getCommentsByParentId(
  parentId: number,
  limit: number,
  cursor?: number,
) {
  const rows =
    typeof cursor === "number"
      ? (getCommentsByParentIdCursorStmt.all(
          parentId,
          cursor,
          limit,
        ) as CommentRow[])
      : (getCommentsByParentIdStmt.all(parentId, limit) as CommentRow[]);
  return rows.map(mapCommentRow);
}

/**
 * Gets the reply counts for a list of parent comment IDs.
 * @param parentIds An array of parent comment IDs to look up reply counts for.
 * @returns A map where the keys are parent comment IDs and the values are the corresponding reply counts.
 */
export function getReplyCounts(parentIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (parentIds.length === 0) return counts;

  const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(", ");
  const rows = db
    .query(
      `SELECT parent_id, COUNT(*) as count FROM comments WHERE parent_id IN (${placeholders}) GROUP BY parent_id`,
    )
    .all(...parentIds) as { parent_id: number; count: number }[];

  for (const row of rows) {
    counts.set(row.parent_id, Number(row.count));
  }
  return counts;
}

/**
 * Inserts a new comment into the database.
 * @param userId The ID of the user making the comment.
 * @param slug The slug associated with the comment.
 * @param parentId The ID of the parent comment, or null if this is a top-level comment.
 * @param body The content of the comment.
 * @returns The newly inserted Comment object.
 */
export function insertComment(
  userId: string,
  slug: string,
  parentId: number | null,
  body: string,
) {
  const now = Date.now();
  insertCommentStmt.run(userId, slug, parentId, body, now, null, null);

  const row = db.query(`SELECT last_insert_rowid() AS id`).get() as {
    id: number;
  };

  return getCommentById(row.id)!;
}
/**
 * Edits an existing comment.
 * @param id The ID of the comment to edit.
 * @param body The new content of the comment.
 * @returns The updated Comment object, or null if the comment does not exist.
 */
export function editComment(id: number, body: string) {
  const now = Date.now();
  editCommentStmt.run(body, now, id);

  return getCommentById(id);
}

/**
 * Deletes a comment.
 * @param id The ID of the comment to delete.
 * @returns The deleted Comment object, or null if the comment does not exist.
 */
export function deleteComment(id: number) {
  const now = Date.now();
  deleteCommentStmt.run(now, id);

  return getCommentById(id);
}
