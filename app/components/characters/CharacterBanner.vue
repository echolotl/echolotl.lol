<template>
  <div class="character-banner" :class="bannerVariant">
    <SketchFilter
      id="sketch-banner-title"
      :seed="64"
      flood-color="var(--background)" />

    <div class="character-banner__content">
      <div class="character-banner__texture-layer">
        <div
          class="character-banner__texture"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/texture.png)`,
            maskPosition: `0 ${scrollY}px`,
          }" />
      </div>
      <div class="character-banner__underlay" />
      <div class="character-banner__images">
        <div
          class="character-banner__image"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/banner.png)`,
          }" />
        <div
          class="character-banner__image left"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/banner.png)`,
          }" />
      </div>
      <div class="character-banner__title">
        <h1 class="character-banner__title-image">
          {{ character.name }}
        </h1>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CharactersCollectionItem } from "@nuxt/content";
import SketchFilter from "~/components/ui/SketchFilter.vue";

const scrollY = ref(0);

function onScroll() {
  if (window.scrollY > 600) return;
  scrollY.value = window.scrollY * 0.5;
}

onMounted(() => {
  scrollY.value = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});

const props = defineProps<{
  character: CharactersCollectionItem;
}>();

const titleImage = `url(/images/characters/${props.character.slug}/title.png)`;
const bannerVariant = computed(() => {
  switch (props.character.slug) {
    case "nautilus":
      return "character-banner--nautilus";
    case "nae":
      return "character-banner--nae";
    case "quiver":
      return "character-banner--quiver";
    case "sesame":
      return "character-banner--sesame";
    case "unyruu":
      return "character-banner--unyruu";
    default:
      return null;
  }
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/_mixins" as *;
.character-banner {
  position: relative;
  height: 600px;
  overflow: hidden;
  z-index: -1;
  @media not screen {
    display: none;
  }
}

.character-banner__content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: -1;
  @media (max-width: 768px) {
    justify-content: flex-start;
  }
}

.character-banner__texture {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--theme-color);
  opacity: 0.3;
  z-index: -1;
  mask-repeat: repeat;
  mask-size: 300px 300px;
  mask-origin: content-box;
  @include theme-transition;
}

.character-banner__texture-layer {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.character-banner__image {
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: var(--inverted-solid);
  background-position: center;
  z-index: -1;
  mask-origin: content-box;
  mask-repeat: no-repeat;
  mask-position: right;
  &.left {
    left: 0;
    right: auto;
    transform: scaleX(-1);
    @media (max-width: 768px) {
      display: none;
    }
  }
}
.character-banner__underlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  @include gradient-fade-bottom(var(--theme-color));
  @include theme-transition;
}
.character-banner__underlay::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-color: var(--background);
  mask-image: linear-gradient(to top, black, transparent);
  @include theme-transition;
}
.character-banner--nautilus .character-banner__underlay {
  background: repeating-linear-gradient(
    to right,
    var(--theme-color) 0%,
    #d64eff 25%,
    var(--theme-color) 50%
  );
  background-size: 200% 100%;
  animation: nautilus-gradient-scroll 12s linear infinite;
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.character-banner--nautilus .character-banner__texture {
  background: repeating-linear-gradient(
    to right,
    var(--theme-color) 0%,
    #d64eff 25%,
    var(--theme-color) 50%
  );
  background-size: 200% 100%;
  animation: nautilus-gradient-scroll 12s linear infinite reverse;
}

.character-banner--nautilus .character-banner__texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

@keyframes nautilus-gradient-scroll {
  to {
    background-position: 100% center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .character-banner--nautilus .character-banner__underlay,
  .character-banner--nautilus .character-banner__texture {
    animation: none;
  }
}

.character-banner--nae .character-banner__underlay {
  background: repeating-conic-gradient(
    at 50% 0%,
    var(--theme-color) 0% 8.25%,
    #131c97 8.25% 16.5%,
    var(--theme-color) 16.5% 25%
  );
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.character-banner--nae .character-banner__texture {
  background: repeating-conic-gradient(
    at 50% 0%,
    var(--theme-color) 0% 8.25%,
    #7b84ff 8.25% 16.5%,
    var(--theme-color) 16.5% 25%
  );
  mask-size: 100px 100px;
}

.character-banner--nae .character-banner__texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.character-banner--sesame .character-banner__underlay {
  background: linear-gradient(to bottom, var(--theme-color), #ff6600);
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.character-banner--sesame .character-banner__texture {
  background: linear-gradient(to right, var(--theme-color), #ff6600);
}

.character-banner--sesame .character-banner__texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.character-banner--unyruu .character-banner__underlay {
  background: linear-gradient(to bottom, #f8c0ff, var(--theme-color) 50%);
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.character-banner--unyruu .character-banner__texture {
  background: linear-gradient(to top, #f8c0ff, var(--theme-color) 75%);
}

.character-banner--unyruu .character-banner__texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.character-banner__images {
  @include mask-gradient(to top, transparent, 0%, black, 70%);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}
.character-banner__title {
  &-image {
    background-color: color-mix(
      in oklch,
      var(--theme-color) 50%,
      var(--inverted-solid) 50%
    );
    mask-image: v-bind(titleImage);
    width: 600px;
    height: 200px;
    mask-repeat: no-repeat;
    mask-position: center;
    image-rendering: crisp-edges;
  }
  filter: url(#sketch-banner-title);

  @include smooth-transition(background-color, 0.2s);
  @media (max-width: 768px) {
    &-image {
      width: calc(2 / 3) * 100vw;
      mask-size: contain;
      mask-position: left;
    }
    margin-left: 1rem;
  }
}
</style>
