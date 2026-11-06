<template>
  <div class="social-icons">
    <a
      href="https://echolotl.tumblr.com/"
      target="_blank"
      rel="noopener noreferrer"
      class="link tumblr-link"
      aria-label="Go to echolotl's Tumblr"
    >
      <Icon icon="socials/tumblr" :height="iconSize" :width="iconSize" />
    </a>
    <div class="twitter">
      <a
        v-if="!isShiftPressed"
        href="https://x.com/echolotl"
        target="_blank"
        rel="noopener noreferrer"
        class="link"
        aria-label="Go to echolotl's X (formerly Twitter)"
      >
        <Icon icon="socials/x" :height="iconSize" :width="iconSize" />
      </a>
      <a
        v-else
        href="https://twitter.com/echolotl"
        target="_blank"
        rel="noopener noreferrer"
        class="link twitter-link"
        aria-label="Go to echolotl's Twitter"
      >
        <Icon icon="socials/twitter" :height="iconSize" :width="iconSize" />
      </a>
    </div>
    <a
      href="https://echolotl.newgrounds.com/"
      target="_blank"
      rel="noopener noreferrer"
      class="link newgrounds-link"
      aria-label="Go to echolotl's Newgrounds"
    >
      <Icon icon="socials/newgrounds" :height="iconSize" :width="iconSize" />
    </a>
    <a
      href="https://bsky.app/profile/echolotl.lol"
      target="_blank"
      rel="noopener noreferrer"
      class="link bluesky-link"
      aria-label="Go to echolotl's Bluesky"
    >
      <Icon icon="socials/bluesky" :height="iconSize" :width="iconSize" />
    </a>
    <a
      href="https://github.com/echolotl"
      target="_blank"
      rel="noopener noreferrer"
      class="link github-link"
      aria-label="Go to echolotl's GitHub"
    >
      <Icon icon="socials/github" :height="iconSize" :width="iconSize" />
    </a>
    <div class="discord-container">
      <button
        type="button"
        class="discord-icon discord-link"
        @click="copyDiscordToClipboard"
        aria-label="Copy echolotl's Discord username"
      >
        <Icon icon="socials/discord" :height="iconSize" :width="iconSize" />
      </button>
      <span
        v-if="showCopiedText"
        class="copied-text lotl-font"
        :class="{ 'float-up': showCopiedText }"
      >
        @echolotl
      </span>
      <span class="sr-only" role="status">{{ copyStatus }}</span>
    </div>
    <a
      href="https://www.youtube.com/@echolotl"
      target="_blank"
      rel="noopener noreferrer"
      class="link youtube-link"
      aria-label="Go to echolotl's YouTube channel"
    >
      <Icon icon="socials/youtube" :height="iconSize" :width="iconSize" />
    </a>
    <a
      href="https://www.instagram.com/echolotl_/"
      target="_blank"
      rel="noopener noreferrer"
      class="link instagram-link"
      aria-label="Go to echolotl's Instagram"
    >
      <Icon icon="socials/instagram" :height="iconSize" :width="iconSize" />
    </a>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Icon from "~/components/ui/Icon.vue";

const isShiftPressed = ref(false);
const showCopiedText = ref(false);
const copyStatus = ref("");
const iconSize = "2.5rem";

const handleKeyDown = (event) => {
  if (event.key === "Shift") {
    isShiftPressed.value = true;
  }
};

const handleKeyUp = (event) => {
  if (event.key === "Shift") {
    isShiftPressed.value = false;
  }
};

const copyDiscordToClipboard = async () => {
  const discordUsername = "echolotl";
  try {
    await navigator.clipboard.writeText(discordUsername);
    showCopiedText.value = true;
    copyStatus.value = "Discord username copied to clipboard.";

    setTimeout(() => {
      showCopiedText.value = false;
      copyStatus.value = "";
    }, 2000);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
});
</script>

<style lang="scss">
@use "~/assets/styles/partials/_mixins" as *;

.social-icons {
  --tumblr-hover: #eebb00;
  --twitter-hover: #1da1f2;
  --newgrounds-hover: #ff9900;
  --bluesky-hover: #0085ff;
  --github-hover: #6e5494;
  --discord-hover: #5865f2;
  --youtube-hover: #ff0055;
  --instagram-hover: #e1306c;
}

.twitter {
  display: inline-block;
}
.social-icons {
  width: 100%;
  display: flex;
  justify-content: center;
}
.social-icons a,
.social-icons .twitter,
.social-icons .discord-icon {
  text-decoration: none;
  color: inherit;
  @include hover-scale(1.1);
  transition:
    filter 0.2s ease,
    color 0s;
}

.social-icons *:focus {
  outline: none;
}

.tumblr-link:hover,
.tumblr-link:focus-visible {
  color: var(--tumblr-hover);
}
.twitter-link:hover,
.twitter-link:focus-visible {
  color: var(--twitter-hover);
}
.newgrounds-link:hover,
.newgrounds-link:focus-visible {
  color: var(--newgrounds-hover);
}
.bluesky-link:hover,
.bluesky-link:focus-visible {
  color: var(--bluesky-hover);
}
.discord-link:hover,
.discord-link:focus-visible {
  color: var(--discord-hover);
}
.youtube-link:hover,
.youtube-link:focus-visible {
  color: var(--youtube-hover);
}
.instagram-link:hover,
.instagram-link:focus-visible {
  color: var(--instagram-hover);
}

.discord-container {
  position: relative;
  display: inline-block;
  transition:
    filter 0.2s ease,
    color 0s;
}
.discord-icon {
  cursor: pointer;
  @include hover-scale(1.1);
  transition: color 0s;
  display: inline-block;
  padding: 0;
  border: 0;
  background: transparent;
}
.copied-text {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  font-size: var(--small-text);
  white-space: nowrap;
  z-index: 10;
  color: var(--discord-hover);
  filter: drop-shadow(0 0 1px var(--distant));
}
.float-up {
  animation: float-up-centered 2s ease-out forwards;
}
</style>
