export const schemaSql = `
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    slug TEXT NOT NULL,
    parent_id INTEGER REFERENCES comments(id),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    edited_at INTEGER,
    deleted_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug);
  CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
`;
