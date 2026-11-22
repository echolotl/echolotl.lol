export const schemaSql = `
  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    emoji TEXT,
    created_at INTEGER NOT NULL
  );
`;
