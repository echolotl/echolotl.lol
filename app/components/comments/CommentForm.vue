<template>
  <div class="comment-form">
    <UserAvatar :default="!isLoggedIn" :user="publicUser" />
    <form @submit.prevent="submitComment">
      <label class="sr-only" for="comment-body">Write a comment</label>
      <textarea
        id="comment-body"
        class="textarea"
        v-model="commentText"
        :disabled="!isLoggedIn"
        :aria-invalid="Boolean(error)"
        aria-describedby="comment-help comment-error"
        placeholder="Write a comment..."
      ></textarea>
      <div v-if="isLoggedIn" class="comment-actions">
        <button
          type="submit"
          :disabled="submitting || !(commentText.length > 0)"
          class="filled round"
        >
          Post Comment</button
        ><Icon v-if="submitting" icon="loading" width="40px" height="40px" />
        <span
          id="comment-help"
          style="
            color: var(--text-secondary);
            font-size: var(--very-small-text);
          "
          v-else
          >Markdown supported! Commenting as
          <b>{{ getDisplayName(publicUser) }}</b
          >.</span
        >
      </div>
      <div
        v-if="error"
        id="comment-error"
        class="comment-form-error"
        role="alert"
      >
        {{ error }}
      </div>
      <button
        v-if="!isLoggedIn"
        type="button"
        class="discord-login round"
        @click="login"
      >
        Login with
        <DiscordIcon :size="24" style="margin-left: 6px" />
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useComments } from "~/composables/useComments.js";
import { useAuth } from "~/composables/useAuth.js";
import UserAvatar from "~/components/user/UserAvatar.vue";
import DiscordIcon from "~/components/ui/DiscordIcon.vue";
const props = defineProps<Props>();
const { isLoggedIn, login, publicUser, getDisplayName } = useAuth();
const { postComment, error } = useComments(props.slug);
import Icon from "~/components/ui/Icon.vue";
interface Props {
  slug: string;
}

const commentText = ref("");
const submitting = ref(false);

const submitComment = async () => {
  if (isLoggedIn.value) {
    submitting.value = true;
    try {
      await postComment(commentText.value);
      commentText.value = "";
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      submitting.value = false;
    }
  } else {
    login();
  }
};
</script>

<style lang="scss">
button.discord-login {
  background: #5865f2;
  border-color: color-mix(in srgb, #5865f2, var(--inverted-solid) 20%);
  color: white;
  font-weight: bold;
  gap: 4px;
}
form {
  flex: 1;
}
form .textarea {
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

.comment-form {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.comment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.comment-form-error {
  margin-top: 0.5rem;
  color: var(--red);
  font-size: var(--small-text);
}
</style>
