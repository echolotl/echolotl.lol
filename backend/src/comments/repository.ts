import { db } from "../db";
import type { Comment } from "./model";
import type { KeysToSnakeCase } from "../util/types";

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

type CommentRow = KeysToSnakeCase<Comment>;

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
 * Gets a comment by its ID.
 */
export function getCommentById(id: number): Comment | null {
  const row = getCommentByIdStmt.get(id) as CommentRow | undefined;
  if (!row) return null;
  return mapCommentRow(row);
}

/**
 * Gets the top-level comments for a given slug.
 */
export function getTopLevelCommentsBySlug(
  slug: string,
  limit: number,
  cursor?: number,
): Comment[] {
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
 */
export function getCommentsByUserId(userId: string, limit?: number): Comment[] {
  const rows =
    typeof limit === "number"
      ? (getCommentsByUserIdLimitStmt.all(userId, limit) as CommentRow[])
      : (getCommentsByUserIdStmt.all(userId) as CommentRow[]);
  return rows.map(mapCommentRow);
}

/**
 * Gets comments that are replies to a specific parent comment.
 */
export function getCommentsByParentId(
  parentId: number,
  limit: number,
  cursor?: number,
): Comment[] {
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
 */
export function getReplyCounts(parentIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (parentIds.length === 0) return counts;

  const placeholders = parentIds.map((_, index) => `$${index + 1}`).join(", ");
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
 */
export function insertComment(
  userId: string,
  slug: string,
  parentId: number | null,
  body: string,
): Comment {
  const now = Date.now();
  insertCommentStmt.run(userId, slug, parentId, body, now, null, null);

  const row = db.query(`SELECT last_insert_rowid() AS id`).get() as {
    id: number;
  };

  return getCommentById(row.id)!;
}

/**
 * Edits an existing comment.
 */
export function editComment(id: number, body: string): Comment | null {
  const now = Date.now();
  editCommentStmt.run(body, now, id);

  return getCommentById(id);
}

/**
 * Deletes a comment.
 */
export function deleteComment(id: number): Comment | null {
  const now = Date.now();
  deleteCommentStmt.run(now, id);

  return getCommentById(id);
}
