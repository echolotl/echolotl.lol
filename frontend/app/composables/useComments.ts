import type { PublicUser } from "./useAuth";

export interface CommentNode {
  id: number;
  slug: string;
  parentId: number | null;
  body: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  author: PublicUser | null;
  replyCount: number;
}

interface CommentsResponse {
  slug: string;
  comments: CommentNode[];
  nextCursor: number | null;
}

interface RepliesResponse {
  parentId: number;
  replies: CommentNode[];
  nextCursor: number | null;
}

function backendUrl() {
  return useRuntimeConfig().public.backendUrl as string;
}

export function useComments(slug: string) {
  const comments = useState<CommentNode[]>(`comments-${slug}`, () => []);
  const nextCursor = useState<number | null>(
    `comments-cursor-${slug}`,
    () => null,
  );
  const loading = useState<boolean>(`comments-loading-${slug}`, () => false);
  const error = useState<string | null>(`comments-error-${slug}`, () => null);

  async function fetchComments(reset = false) {
    loading.value = true;
    error.value = null;
    try {
      const url = new URL(
        `${backendUrl()}/comments/s/${encodeURIComponent(slug)}`,
      );
      if (!reset && nextCursor.value !== null) {
        url.searchParams.set("cursor", String(nextCursor.value));
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = (await res.json()) as CommentsResponse;
      comments.value = reset
        ? data.comments
        : [...comments.value, ...data.comments];
      nextCursor.value = data.nextCursor;
    } catch (err) {
      console.error("Error fetching comments:", err);
      error.value = err instanceof Error ? err.message : "Unknown error";
    } finally {
      loading.value = false;
    }
  }

  async function postComment(body: string): Promise<CommentNode> {
    error.value = null;
    try {
      const res = await fetch(
        `${backendUrl()}/comments/s/${encodeURIComponent(slug)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "text/plain" },
          body,
        },
      );
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const comment = (await res.json()) as CommentNode;
      comments.value = [comment, ...comments.value];
      return comment;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  async function editComment(
    comment: CommentNode,
    body: string,
  ): Promise<CommentNode> {
    error.value = null;
    try {
      const res = await fetch(`${backendUrl()}/comments/${comment.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "text/plain" },
        body,
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const updated = (await res.json()) as CommentNode;
      if (comment.parentId === null) {
        comments.value = comments.value.map((c) =>
          c.id === comment.id ? updated : c,
        );
      } else {
        const replies = useState<CommentNode[]>(
          `replies-${comment.parentId}`,
          () => [],
        );
        replies.value = replies.value.map((c) =>
          c.id === comment.id ? updated : c,
        );
      }
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  async function deleteComment(comment: CommentNode): Promise<void> {
    error.value = null;
    try {
      const res = await fetch(`${backendUrl()}/comments/${comment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (comment.parentId === null) {
        comments.value = comments.value.map((c) =>
          c.id === comment.id ? { ...c, deletedAt: Date.now() } : c,
        );
      } else {
        const replies = useState<CommentNode[]>(
          `replies-${comment.parentId}`,
          () => [],
        );
        replies.value = replies.value.map((c) =>
          c.id === comment.id ? { ...c, deletedAt: Date.now() } : c,
        );
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  return {
    comments,
    nextCursor,
    loading,
    error,
    fetchComments,
    postComment,
    editComment,
    deleteComment,
  };
}

export function useReplies(parentId: number) {
  const replies = useState<CommentNode[]>(`replies-${parentId}`, () => []);
  const nextCursor = useState<number | null>(
    `replies-cursor-${parentId}`,
    () => null,
  );
  const loading = useState<boolean>(`replies-loading-${parentId}`, () => false);
  const error = useState<string | null>(
    `replies-error-${parentId}`,
    () => null,
  );

  async function fetchReplies(reset = false) {
    loading.value = true;
    error.value = null;
    try {
      const url = new URL(`${backendUrl()}/comments/${parentId}/replies`);
      if (!reset && nextCursor.value !== null) {
        url.searchParams.set("cursor", String(nextCursor.value));
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = (await res.json()) as RepliesResponse;
      replies.value = reset
        ? data.replies
        : [...replies.value, ...data.replies];
      nextCursor.value = data.nextCursor;
    } catch (err) {
      console.error("Error fetching replies:", err);
      error.value = err instanceof Error ? err.message : "Unknown error";
    } finally {
      loading.value = false;
    }
  }

  async function postReply(body: string): Promise<CommentNode> {
    error.value = null;
    try {
      const res = await fetch(`${backendUrl()}/comments/${parentId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "text/plain" },
        body,
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reply = (await res.json()) as CommentNode;
      replies.value = [...replies.value, reply];
      return reply;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  return {
    replies,
    nextCursor,
    loading,
    error,
    fetchReplies,
    postReply,
  };
}
