import type { Database } from "bun:sqlite";

export const schemaSql = `
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
`;

export function migrate(db: Database): void {
  const userTableColumns = db.query(`PRAGMA table_info(users)`).all() as {
    name: string;
  }[];

  if (!userTableColumns.some((column) => column.name === "user_id")) {
    db.run(`ALTER TABLE users ADD COLUMN user_id TEXT`);
  }

  if (!userTableColumns.some((column) => column.name === "anonymous")) {
    db.run(`ALTER TABLE users ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0`);
  }

  if (!userTableColumns.some((column) => column.name === "should_sync")) {
    db.run(
      `ALTER TABLE users ADD COLUMN should_sync INTEGER NOT NULL DEFAULT 1`,
    );
  }

  db.run(`UPDATE users SET user_id = id WHERE user_id IS NULL OR user_id = ''`);
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`,
  );
}
