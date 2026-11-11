import type { CommentNode } from "@echolotl/types";

export interface Comment {
  id: number;
  userId: string;
  slug: string;
  parentId: number | null;
  body: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
}

export type UserComment = Omit<CommentNode, "author" | "replyCount">;
