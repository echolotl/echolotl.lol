export const schemaSql = `
  CREATE TABLE IF NOT EXISTS spotify_token (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`;
