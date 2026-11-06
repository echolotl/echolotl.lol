<template>
  <div class="splash-text">
    {{ splashText }}
  </div>
</template>

<style>
.splash-text {
  font-size: var(--small-text);
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem 1rem;
}
</style>

<script setup lang="ts">
import { SPLASH_TEXTS } from "~~/types/constants";

const getSplashText = () => {
  const index = Math.floor(Math.random() * SPLASH_TEXTS.length);
  return SPLASH_TEXTS[index] || "b";
};

const splashText = ref("");

onMounted(() => {
  splashText.value = getSplashText();
});
</script>
