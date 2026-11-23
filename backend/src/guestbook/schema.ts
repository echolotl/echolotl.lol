export const schemaSql = `
  CREATE TABLE IF NOT EXISTS guestbook_snapshot (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    paths TEXT NOT NULL
  );
`;
