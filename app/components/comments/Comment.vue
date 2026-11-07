<template>
  <div class="comment">
    <div v-if="props.comment.deletedAt" class="comment-deleted">
      This comment has been deleted.
    </div>
    <div v-else class="comment-header">
      <UserAvatar :user="props.comment.author" />
      <div v-if="props.comment.author">
        <p class="lotl-font">
          {{ getDisplayName(props.comment.author) }}
          <span class="text-secondary"
            >@{{ props.comment.author?.username }}</span
          >
        </p>
        <p class="text-secondary">
          {{ formatDateTime(new Date(props.comment.createdAt)) }}
          <span v-if="props.comment.editedAt">(edited)</span>
        </p>
      </div>
      <div v-else>
        <p class="lotl-font">Deleted User</p>
        <p class="text-secondary">
          {{ formatDateTime(new Date(props.comment.createdAt)) }}
          <span v-if="props.comment.editedAt">(edited)</span>
        </p>
      </div>
      <div v-if="!isEditing" class="comment-header-actions">
        <button
          v-if="isLoggedIn"
          type="button"
          class="comment-reply-button"
          @click="toggleReplyForm"
        >
          Reply <Icon icon="comment" size="18px" />
        </button>
        <template v-if="props.comment.author?.userId == user?.userId">
          <button
            type="button"
            class="comment-action-button"
            aria-label="Edit comment"
            :disabled="deleting"
            @click="startEditing"
          >
            <Icon icon="pencil" size="18px" />
          </button>
          <button
            type="button"
            class="comment-action-button"
            aria-label="Delete comment"
            :disabled="deleting"
            @click="handleDelete"
          >
            <Icon v-if="deleting" icon="loading" size="18px" />
                        <Icon v-else icon="trash" size="18px" />
          </button>
        </template>
      </div>
    </div>
    <div v-if="commentError" class="comment-error" role="alert">
      {{ commentError }}
    </div>
    <div class="comment-content" v-if="!props.comment.deletedAt && !isEditing">
      <p v-html="parsedBody"></p>
    </div>
    <div class="comment-edit" v-else-if="isEditing">
      <label class="sr-only" :for="`edit-comment-${props.comment.id}`">
        Edit comment
      </label>
      <textarea
        :id="`edit-comment-${props.comment.id}`"
        class="textarea"
        v-model="editText"
      ></textarea>
      <div class="comment-edit-actions">
        <button
          type="button"
          :disabled="saving || !(editText.length > 0)"
          @click="saveEdit"
        >
          Save
        </button>
        <button type="button" :disabled="saving" @click="cancelEdit">
          Cancel
        </button>
        <Icon v-if="saving" icon="loading" size="24px" />
      </div>
    </div>
    <div
      v-if="!props.comment.deletedAt && !isEditing && replyCount > 0"
      class="comment-footer"
    >
      <button
        type="button"
        class="comment-replies-toggle"
        @click="toggleReplies"
      >
        {{
          repliesVisible
            ? "Hide replies"
            : `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
        }}
      </button>
    </div>
    <div v-if="repliesError" class="comment-error" role="alert">
      {{ repliesError }}
    </div>
    <div v-if="showReplyForm" class="comment-reply-form">
      <label class="sr-only" :for="`reply-comment-${props.comment.id}`">
        Write a reply
      </label>
      <textarea
        :id="`reply-comment-${props.comment.id}`"
        class="textarea"
        v-model="replyText"
      ></textarea>
      <div class="comment-edit-actions">
        <button
          type="button"
          :disabled="submittingReply || !(replyText.length > 0)"
          @click="submitReply"
          class="filled round"
        >
          Post Reply
        </button>
        <button type="button" :disabled="submittingReply" @click="cancelReply">
          Cancel
        </button>
        <Icon
          v-if="submittingReply"
          icon="loading"
          size="24px"
        />
      </div>
    </div>
    <div v-if="repliesVisible" class="comment-replies">
      <div
        v-if="repliesLoading && replies.length === 0"
        class="comment-replies-loading"
      >
        Loading replies...
      </div>
      <Comment v-for="reply in replies" :key="reply.id" :comment="reply" />
      <button
        v-if="repliesNextCursor !== null"
        type="button"
        class="load-more-replies"
        :disabled="repliesLoading"
        @click="loadMoreReplies"
      >
        {{ repliesLoading ? "Loading..." : "Load more replies" }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeExternalLinks from "rehype-external-links";
import rehypeStringify from "rehype-stringify";
import UserAvatar from "~/components/user/UserAvatar.vue";
import Icon from "~/components/ui/Icon.vue";
import { useAuth } from "~/composables/useAuth";
const { user, isLoggedIn, login, getDisplayName } = useAuth();
import {
  type CommentNode,
  useComments,
  useReplies,
} from "~/composables/useComments";
interface Props {
  comment: CommentNode;
}
const props = defineProps<Props>();
const {
  deleteComment,
  editComment,
  error: commentError,
} = useComments(props.comment.slug);
const {
  replies,
  nextCursor: repliesNextCursor,
  loading: repliesLoading,
  error: repliesError,
  fetchReplies,
  postReply,
} = useReplies(props.comment.id);
const deleting = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editText = ref("");
const repliesVisible = ref(false);
const showReplyForm = ref(false);
const replyText = ref("");
const submittingReply = ref(false);
const replyCount = computed(
  () => replies.value.length || props.comment.replyCount,
);

const handleDelete = async () => {
  if (!confirm("Are you sure you want to delete this comment?")) return;
  deleting.value = true;
  try {
    await deleteComment(props.comment);
  } catch (err) {
    console.error("Error deleting comment:", err);
  } finally {
    deleting.value = false;
  }
};

const startEditing = async () => {
  editText.value = props.comment.body;
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editText.value = "";
};

const saveEdit = async () => {
  if (!(editText.value.length > 0)) return;
  saving.value = true;
  try {
    await editComment(props.comment, editText.value);
    isEditing.value = false;
  } catch (err) {
    console.error("Error editing comment:", err);
  } finally {
    saving.value = false;
  }
};

const toggleReplies = async () => {
  if (!repliesVisible.value && replies.value.length === 0) {
    await fetchReplies(true);
  }
  repliesVisible.value = !repliesVisible.value;
};

const loadMoreReplies = () => fetchReplies();

const toggleReplyForm = () => {
  if (!isLoggedIn.value) {
    login();
    return;
  }
  showReplyForm.value = !showReplyForm.value;
  if (!showReplyForm.value) {
    replyText.value = "";
  }
};

const cancelReply = () => {
  showReplyForm.value = false;
  replyText.value = "";
};

const submitReply = async () => {
  if (!(replyText.value.length > 0)) return;
  submittingReply.value = true;
  try {
    await postReply(replyText.value);
    replyText.value = "";
    showReplyForm.value = false;
    repliesVisible.value = true;
  } catch (err) {
    console.error("Error posting reply:", err);
  } finally {
    submittingReply.value = false;
  }
};

const parsedBody = computed(() => {
  return props.comment?.body
    ? unified()
        .use(remarkParse)
        .use(remarkRehype)
        // Sanitize before adding link attributes/rendering so user-submitted
        // markdown can't smuggle raw HTML, event handlers, or javascript:/data:
        // URIs through into innerHTML (v-html below).
        .use(rehypeSanitize)
        .use(rehypeExternalLinks)
        .use(rehypeStringify)
        .processSync(props.comment.body)
        .toString()
    : "";
});
</script>

<style scoped lang="scss">
.comment {
  margin-bottom: 1rem;
}
.comment-deleted {
  font-style: italic;
  color: var(--text-secondary);
  font-size: var(--small-text);
}
.comment-error {
  margin-top: 0.5rem;
  color: var(--red);
  font-size: var(--small-text);
}
.comment-replies-loading {
  color: var(--text-secondary);
  font-size: var(--small-text);
  margin-bottom: 0.5rem;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.comment-content {
  margin-top: 0.5rem;
  overflow-wrap: break-word;
  word-break: break-word;
}
.comment-header-actions {
  margin-left: auto;
  display: flex;
  align-items: flex-start;
  align-self: flex-start;
  gap: 4px;
}
.comment-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text);
  opacity: 0.6;
  &:hover:not(:disabled) {
    opacity: 1;
  }
  &:disabled {
    cursor: default;
  }
}
.comment-edit {
  margin-top: 0.5rem;
}
.comment-edit .textarea {
  display: block;
  width: 100%;
  min-height: 1rem;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  margin-bottom: 8px;
  resize: none;
  border: 1px solid var(--distant);
  background: var(--surface);
  padding: 8px;
  color: var(--text);
  font-family: var(--base-font);
  font-size: var(--base-text);
}
.comment-edit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.comment-footer {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 12px;
}
.comment-reply-button {
  background: none;
  border: none;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--text);
  opacity: 0.6;
  font-size: var(--small-text);
  font-weight: bold;
  &:hover:not(:disabled) {
    opacity: 1;
  }
  &:disabled {
    cursor: default;
  }
}
.comment-replies-toggle {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--small-text);
  font-weight: bold;
  &:hover {
    color: var(--text);
    text-decoration: underline;
  }
}
.comment-reply-form {
  margin-top: 0.5rem;
}
.comment-reply-form .textarea {
  display: block;
  width: 100%;
  min-height: 1rem;
  max-width: 100%;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  margin-bottom: 8px;
  resize: none;
  border: 1px solid var(--distant);
  background: var(--surface);
  padding: 8px;
  color: var(--text);
  font-family: var(--base-font);
  font-size: var(--base-text);
}
.comment-replies {
  margin-top: 0.75rem;
  padding: 0.5rem 0 0.25rem 1rem;
  border-left: 2px solid var(--distant);
}
.load-more-replies {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--small-text);
  font-weight: bold;
  &:hover:not(:disabled) {
    color: var(--text);
    text-decoration: underline;
  }
  &:disabled {
    cursor: default;
  }
}
</style>
