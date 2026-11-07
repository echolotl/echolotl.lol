<template>
  <div class="picross-page" :style="{ '--picross-accent': accent }">
    <div class="picross-header-container" :style="{ filter: filterUrl }">
      <h1 class="picross-header">Nautilus' Picross</h1>
    </div>
    <span v-if="subtitle" class="header-games lotl-font">{{ subtitle }}</span>

    <div class="header-links">
      <NuxtLink to="/picross" class="link" exact-active-class="active">
        <Icon icon="moves" size="20px" /> Free Play
      </NuxtLink>
      •
      <NuxtLink to="/picross/daily" class="link" exact-active-class="active">
        <Icon icon="date" size="20px" /> Daily
      </NuxtLink>
      •
      <NuxtLink to="/picross/editor" class="link" exact-active-class="active">
        <Icon icon="art" size="20px" /> Editor
      </NuxtLink>
      •
      <button type="button" class="link how-to-play" @click="showHowToPlay = true">
        <Icon icon="help" size="20px" />How To Play
      </button>
    </div>

    <div class="game">
      <slot />
    </div>

    <HowToPlayModal v-model="showHowToPlay" />
  </div>
</template>

<script setup lang="ts">
import HowToPlayModal from "~/components/picross/HowToPlayModal.vue";
import Icon from "~/components/ui/Icon.vue";

const { url: filterUrl } = useSketchFilter({ color: "var(--background)" });

withDefaults(
  defineProps<{
    subtitle?: string | null;
    accent?: string;
  }>(),
  { subtitle: null, accent: "#e438e4" },
);

const showHowToPlay = ref(false);
</script>

<style scoped>
.picross-page {
  margin: 0 auto;
  margin-top: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 80vh;
  position: relative;
  max-width: 1200px;

  &::before {
    content: "";
    position: absolute;
    top: -64px;
    left: 0;
    display: block;
    height: 500px;
    width: 100%;
    opacity: 0.5;
    background: radial-gradient(
      circle 400px at 50% -10%,
      var(--picross-accent),
      transparent
    );
  }
}

.picross-header-container {
  position: relative;
  width: 100%;
  view-transition-name: picross-title;
}

.picross-header {
  position: relative;
  mask-image: url("/images/picross/daily.webp");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  background-color: var(--text);
  height: 100px;
  width: 100%;
}

.header-games {
  position: relative;
  z-index: 1;
  margin-top: -28px;
  font-size: 1.25rem;
  paint-order: stroke;
  -webkit-text-stroke: 6px var(--background);
  width: fit-content;
  view-transition-name: picross-subtitle;
}

.header-links {
  text-transform: uppercase;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  z-index: 1;
  view-transition-name: picross-navigation;

  .link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--picross-accent);
    cursor: pointer;
  }

  .link.active {
    font-weight: bold;
  }

  .how-to-play {
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
  }
}

.game {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
}

.game :deep(.solved-message) {
  margin: 0;
  font-weight: bold;
}

.game :deep(.game-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;

  > button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
  }
}

.game :deep(.loading) {
  font-size: 1rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  height: 400px;
  justify-content: center;
}
</style>
