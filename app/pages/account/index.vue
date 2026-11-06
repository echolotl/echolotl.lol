<template>
  <div class="settings-page">
    <template v-if="user">
      <div class="header" :style="{ '--pfp': `url(${getAvatarUrl(user)})` }">
        <UserAvatar :user="user" :size="128" />
        <div class="user-info">
          <h1 class="display-name">
            {{ getDisplayName(user) }}
            <span v-if="user.anonymous" style="color: var(--text-secondary)"
              >({{ getDisplayName(publicUser) }})</span
            >
          </h1>
          <h2 class="username">
            @{{ user.username }}
            <span v-if="user.anonymous" style="color: var(--text-secondary)"
              >(@{{ publicUser?.username }})</span
            >
          </h2>
          <span class="date">
            Created on
            <b>{{ formatDate(new Date(user.createdAt)) }}</b>
          </span>
        </div>
      </div>
      <div class="actions">
        <button
          class="round"
          style="display: flex; align-items: center; gap: 8px"
          type="button"
          @click="logoutAndRedirect"
        >
          <Icon icon="logout" width="24px" height="24px" />
          Log Out
        </button>

        <button
          style="display: flex; align-items: center; gap: 8px"
          type="button"
          :disabled="deletingAccount"
          @click="handleDeleteAccount"
          class="filled red round"
        >
          <Icon icon="trash" width="24px" height="24px" />
          {{ deletingAccount ? "Deleting..." : "Delete Account" }}
        </button>
      </div>
      <span class="discord-id"><DiscordIcon :size="24" />{{ user.id }}</span>
      <span v-if="saving" class="saving-indicator">Saving...</span>
      <div class="settings-body">
        <div class="settings-section">
          <h2>Privacy</h2>
          <label>
            <input
              type="checkbox"
              :checked="user?.anonymous ?? false"
              @change="onToggleAnonymous"
              :disabled="saving"
            />
            <div>
              <div><b>Post anonymously</b></div>
              <div class="text-secondary">
                Hide your username, avatar, and Discord ID from other visitors
                on comments and throughout the backend.
              </div>
            </div>
          </label>
        </div>
      </div>
    </template>
    <div v-else class="not-logged-in">
      <p class="subtitle">You're not logged in.</p>
      <button type="button" class="discord-login round" @click="login">
        Login with
        <DiscordIcon :size="24" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import UserAvatar from "~/components/common/UserAvatar.vue";
import Icon from "~/components/common/Icon.vue";
import DiscordIcon from "~/components/common/DiscordIcon.vue";

const {
  user,
  login,
  logout,
  setAnonymous,
  deleteAccount,
  getDisplayName,
  publicUser,
  getAvatarUrl,
} = useAuth();

const saving = ref(false);
const deletingAccount = ref(false);
const deleteError = ref<string | null>(null);

const logoutAndRedirect = () => {
  window.location.href = "/";
  logout();
};

async function onToggleAnonymous(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  saving.value = true;
  try {
    await setAnonymous(checked);
  } catch (err) {
    console.error("Error updating anonymous setting:", err);
  } finally {
    saving.value = false;
  }
}

async function handleDeleteAccount() {
  deletingAccount.value = true;
  deleteError.value = null;
  try {
    await deleteAccount();
    window.location.href = "/";
  } catch (err) {
    console.error("Error deleting account:", err);
    deleteError.value =
      err instanceof Error ? err.message : "Failed to delete account.";
  } finally {
    deletingAccount.value = false;
  }
}

useSeoMeta({
  title: "Account - echolotl.lol",
});
</script>

<style scoped lang="scss">
.settings-page {
  margin: 0 auto;
  padding: 2rem;
  max-width: 1200px;
  min-height: 80vh;
  justify-content: center;
  h1 {
    text-align: center;
  }
}

button.discord-login {
  background: #5865f2;
  border-color: color-mix(in srgb, #5865f2, var(--inverted-solid) 20%);
  color: white;
  font-weight: bold;
  justify-content: center;
  gap: 4px;
}
.not-logged-in {
  text-align: center;
  width: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 5rem auto;
  .subtitle {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding-top: 32px;
}

.header::before {
  content: "";
  display: block;
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  height: 300px;
  width: 1000px;
  background-color: var(--surface);
  background-image: var(--pfp);
  background-size: cover;
  background-position: center;
  filter: blur(16px);
  mask-image: radial-gradient(farthest-side at top, black, transparent);
}
.user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  .display-name {
    margin: 0;
    margin-top: 0.5rem;
    font-size: 2rem;
    text-align: center;
  }
  .username {
    margin: 0;
    font-size: 1.25rem;
    text-align: center;
    color: var(--text-secondary);
  }
  .date {
    padding: 0.25rem 0;
    text-align: center;
  }
}

.actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
}

.settings-body {
  max-width: 1000px;
  margin: 0 auto;
  .settings-section {
    margin-bottom: 2rem;
    h2 {
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 1rem;
      margin-top: 1.5rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--distant);
    }

    label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;

      :not(input[type="checkbox"]) {
        flex-direction: column;
      }

      input[type="checkbox"] {
        margin-top: 0.2rem;
        width: 16px;
        height: 16px;
        accent-color: var(--primary);
        cursor: pointer;
      }
    }
  }
}

.discord-id {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: center;
  color: var(--text-secondary);
}
</style>
