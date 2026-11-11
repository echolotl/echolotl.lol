<template>
  <div class="comment-section">
    <div class="text-secondary disclaimer">
      Comments are sorted by newest first. Report anything bad to echolotl on
      Discord.
    </div>
    <hr style="margin-bottom: 1rem" />
    <div v-if="loading && comments.length === 0" class="comments-status">
      Loading comments...
    </div>
    <div
      v-else-if="error && comments.length === 0"
      class="comments-status comments-error"
    >
      Failed to load comments: {{ error }}
      <button type="button" class="comments-retry" @click="fetchComments(true)">
        Retry
      </button>
    </div>
    <Comment v-for="comment in comments" :key="comment.id" :comment="comment" />
    <div
      v-if="error && comments.length > 0"
      class="comments-status comments-error"
    >
      Failed to load more comments: {{ error }}
      <button type="button" class="comments-retry" @click="fetchComments()">
        Retry
      </button>
    </div>
    <button
      v-if="nextCursor !== null"
      type="button"
      class="load-more-comments"
      :disabled="loading"
      @click="fetchComments()"
    >
      {{ loading ? "Loading..." : "Load more comments" }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import Comment from "~/components/comments/Comment.vue";
import { useComments } from "~/composables/useComments";

interface Props {
  slug: string;
}
const props = defineProps<Props>();
const { comments, nextCursor, loading, error, fetchComments } = useComments(
  props.slug,
);

onMounted(async () => {
  if (comments.value.length === 0) {
    await fetchComments(true);
  }
});
</script>

<style scoped lang="scss">
.load-more-comments {
  display: block;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--small-text);
  font-weight: bold;
  margin-top: 0.5rem;
  &:hover:not(:disabled) {
    color: var(--text);
    text-decoration: underline;
  }
  &:disabled {
    cursor: default;
  }
}

.comment-section .disclaimer {
  font-size: var(--small-text);
  margin: 1rem 0;
}

.comments-status {
  font-size: var(--small-text);
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.comments-error {
  color: var(--red);
  display: flex;
  align-items: center;
  gap: 8px;
}

.comments-retry {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font-weight: bold;
  text-decoration: underline;
}
</style>
