<template>
  <div class="character-banner" :class="bannerVariant">
    <div class="content">
      <div class="texture-layer">
        <div
          class="texture"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/texture.png)`,
            maskPosition: `0 ${scrollY}px`,
          }" />
      </div>
      <div class="underlay" />
      <div class="images">
        <div
          class="image"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/banner.png)`,
          }" />
        <div
          class="image left"
          :style="{
            maskImage: `url(/images/characters/${character.slug}/banner.png)`,
          }" />
      </div>
      <div
        class="title"
        :style="{ filter: filterUrl }"
      >
        <h1 class="title-image">
          {{ character.name }}
        </h1>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CharactersCollectionItem } from "@nuxt/content";

const { url: filterUrl } = useSketchFilter({
  color: "var(--background)",
  seed: 64,
});

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
      return "nautilus";
    case "nae":
      return "nae";
    case "quiver":
      return "quiver";
    case "sesame":
      return "sesame";
    case "unyruu":
      return "unyruu";
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

.content {
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

.texture {
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

.texture-layer {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.image {
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
.underlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  @include gradient-fade-bottom(var(--theme-color));
  @include theme-transition;
}
.underlay::after {
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
.nautilus .underlay {
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
.nautilus .texture {
  background: repeating-linear-gradient(
    to right,
    var(--theme-color) 0%,
    #d64eff 25%,
    var(--theme-color) 50%
  );
  background-size: 200% 100%;
  animation: nautilus-gradient-scroll 12s linear infinite reverse;
}

.nautilus .texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

@keyframes nautilus-gradient-scroll {
  to {
    background-position: 100% center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nautilus .underlay,
  .nautilus .texture {
    animation: none;
  }
}

.nae .underlay {
  background: repeating-conic-gradient(
    at 50% 0%,
    var(--theme-color) 0% 8.25%,
    #131c97 8.25% 16.5%,
    var(--theme-color) 16.5% 25%
  );
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.nae .texture {
  background: repeating-conic-gradient(
    at 50% 0%,
    var(--theme-color) 0% 8.25%,
    #7b84ff 8.25% 16.5%,
    var(--theme-color) 16.5% 25%
  );
  mask-size: 100px 100px;
}

.nae .texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.sesame .underlay {
  background: linear-gradient(to bottom, var(--theme-color), #ff6600);
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.sesame .texture {
  background: linear-gradient(to right, var(--theme-color), #ff6600);
}

.sesame .texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.unyruu .underlay {
  background: linear-gradient(to bottom, #f8c0ff, var(--theme-color) 50%);
  opacity: 1;
  mask-image: linear-gradient(to bottom, black, transparent);
}
.unyruu .texture {
  background: linear-gradient(to top, #f8c0ff, var(--theme-color) 75%);
}

.unyruu .texture-layer {
  @include mask-gradient(to bottom, black, 0%, transparent, 100%);
}

.images {
  @include mask-gradient(to top, transparent, 0%, black, 70%);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}
.title {
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
