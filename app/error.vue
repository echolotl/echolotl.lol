<script setup lang="ts">
import type { NuxtError } from "#app";
import Icon from "./components/ui/Icon.vue";

defineProps({
  error: {
    type: Object as () => NuxtError,
    default: () => ({ statusCode: null, message: "" }),
  },
});

const availableChars = ["echo", "glory", "king"];

const selectedChar =
  availableChars[Math.floor(Math.random() * availableChars.length)];

const goBack = () => {
  history.back();
};
</script>

<template>
  <div>
    <NuxtLayout>
      <div class="error-page">
        <div
          style="
            display: flex;
            gap: 0.25rem;
            flex-direction: column;
            margin-bottom: 2rem;
            align-items: center;
          ">
          <div
            class="error-image"
            :style="{
              maskImage: `url('/images/${error?.status}.png')`,
            }"
            :alt="`Error ${error?.status}`"
            width="300"
            height="200" />
          <h1
            class="lotl-font"
            style="font-size: 2rem; color: var(--primary); margin-top: 0.5rem">
            {{ error?.message || "An unexpected error occurred." }}
          </h1>
        </div>
        <button @click="goBack" class="clear-error-button">
          <Icon icon="back-arrow" style="margin-right: 0.5rem" />BACK
        </button>
      </div>
      <div
        class="funny-little-guys"
        :style="{
          maskImage: `url('/images/error/${selectedChar}.webp')`,
        }"></div>
    </NuxtLayout>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  margin: 0 auto;
  padding: 2rem;
  margin-top: 2rem;
  max-width: 1200px;
  text-align: center;
}

.error-image {
  width: 300px;
  height: 200px;
  margin: 0 auto;
  background-color: var(--primary);
  mask-size: cover;
}

.clear-error-button {
  font-weight: 900;
}

.funny-little-guys {
  width: 100%;
  height: 100px;
  background-color: var(--yellow);
  mask-size: contain;
  mask-repeat: repeat-x;
  animation:
    horizScroll 0.5s linear infinite,
    rainbow 5s linear infinite;
}

@keyframes horizScroll {
  0% {
    mask-position: 0 0;
  }
  100% {
    mask-position: 100px 0;
  }
}

@keyframes rainbow {
  0%,
  100% {
    background-color: var(--red);
  }
  16.67% {
    background-color: var(--orange);
  }
  33.33% {
    background-color: var(--yellow);
  }
  50% {
    background-color: var(--green);
  }
  66.67% {
    background-color: var(--blue);
  }
  83.33% {
    background-color: var(--purple);
  }
}
</style>
