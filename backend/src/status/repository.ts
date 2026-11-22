import { db } from "../db";
import type { Status } from "@echolotl/types";

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
export function insertStatus(
  status: Omit<Status, "id" | "createdAt">,
): Status {
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
