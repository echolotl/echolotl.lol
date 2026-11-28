<template>
  <div class="picross-page" :style="{ '--picross-accent': accent }">
    <div class="picross-header-container" :style="{ filter: filterUrl }">
      <h1 class="picross-header">Nautilus' Picross</h1>
    </div>
    <span v-if="subtitle" class="header-games lotl-font">{{ subtitle }}</span>

    <div
      class="tabs"
      :style="{
        '--active-anchor': anchorName,
      }"
    >
      <NuxtLink
        to="/picross"
        class="link"
        style="anchor-name: --picross"
        exact-active-class="active"
      >
        <Icon icon="picross" size="20px" /> Free Play
      </NuxtLink>
      <NuxtLink
        to="/picross/daily"
        class="link"
        style="anchor-name: --picross-daily"
        exact-active-class="active"
      >
        <Icon icon="date" size="20px" /> Daily
      </NuxtLink>
      <NuxtLink
        to="/picross/editor"
        class="link"
        style="anchor-name: --picross-editor"
        exact-active-class="active"
      >
        <Icon icon="art" size="20px" /> Editor
      </NuxtLink>
    </div>

    <div class="game">
      <slot />
    </div>
    <div class="bottom-buttons">
      <button @click="showHowToPlay = true" class="bottom-button">
        <Icon icon="help" size="20px" /> How to Play
      </button>
      <template v-if="route.name === 'picross-daily'">
        <div>&bull;</div>

        <button
          @click="navigateTo('/picross/daily/history')"
          class="bottom-button"
        >
          <Icon icon="redo" size="20px" /> Past Puzzles & Stats
        </button>
      </template>
    </div>

    <HowToPlayModal v-model="showHowToPlay" />
  </div>
</template>

<script setup lang="ts">
import HowToPlayModal from "~/components/picross/HowToPlayModal.vue";
import Icon from "~/components/ui/Icon.vue";

const { url: filterUrl } = useSketchFilter({ color: "var(--background)" });
const route = useRoute();
const anchorName = computed(() => {
  const routePath = route.path.split("/").slice(1, 3);
  return `--${routePath.join("-")}`;
});

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

.tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  margin-top: 8px;
  margin-bottom: 16px;
  z-index: 1;

  &::after {
    content: "";
    display: block;
    height: 4px;
    width: 32px;
    border-radius: 2px;
    background: var(--picross-accent);
    margin-top: 2px;
    position: absolute;
    position-anchor: var(--active-anchor);
    top: calc(anchor(bottom) - 1px);
    left: calc(anchor(center) - 15px);
    view-transition-name: picross-active-indicator;
    transition:
      top 0.3s ease,
      left 0.3s ease;
  }

  > .link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text);
    text-decoration: none;
    padding: 4px 8px;
    border-radius: 8px;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
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

.bottom-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.bottom-button {
  display: flex;
  align-items: center;
  gap: 4px;

  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--text);
  cursor: pointer;
  z-index: 1000;
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
