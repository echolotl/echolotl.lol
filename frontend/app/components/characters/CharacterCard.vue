<template>
  <div
    :to="`/characters/${props.character.slug}`"
    class="character-card"
    :class="{ interacted: hasInteracted }"
    :style="{ '--filter-url': filterUrl }"
    @mouseenter="hasInteracted = true"
    @focusin="hasInteracted = true"
  >
    <NuxtLink :to="`/characters/${props.character.slug}`" class="image">
      <div class="image-bg"></div>

      <div
        class="image-icon"
        :style="{ backgroundImage: characterImage }"
      ></div>
      <div
        class="image-icon-hover"
        :style="{ backgroundImage: characterHoverImage }"
      ></div>
    </NuxtLink>
    <span class="name lotl-font" style="font-size: 1.5rem">{{
      props.character.name
    }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Character } from "~~/types";
import { useTheme } from "~/composables/useTheme.js";

const props = defineProps({
  character: {
    type: Object as () => Character,
    required: true,
  },
});

const hasInteracted = ref(false);
const { theme } = useTheme();

const characterColor = computed(() => {
  if (!props.character) return "#000000";

  if (theme.value && props.character.theme_color_light) {
    return props.character.theme_color_light;
  }
  return props.character.theme_color || "#000000";
});

const { url: filterUrl } = useSketchFilter(() => ({
  color: characterColor.value,
  stdDeviation: 1.5,
  intercept: -6,
}));

const characterImage = `url(/images/characters/${props.character.slug}/icon.webp)`;
const characterHoverImage = `url(/images/characters/${props.character.slug}/hover.webp)`;

const randomRotation = `${Math.floor(Math.random() * 41) - 20}deg`; // -20 to 20 degrees
</script>

<style scoped lang="scss">
@use "~/assets/styles/util" as *;

.character-card {
  --theme-color: v-bind(characterColor);
  position: relative;
  max-width: 300px;
  width: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  transition: transform 0.3s ease;

  & .image {
    position: relative;
    width: 200px;
    height: 200px;
    margin-bottom: 10px;
    &:focus-within {
      outline: none;
    }
  }

  & .image-frame {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--text);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    transition: background-color 0.3s ease;
    z-index: 2;
  }

  & .image-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    will-change: background-position, opacity;
    z-index: 1;
    mask-image: url("/images/art_mask.png");
    mask-size: 160px 160px;
    mask-repeat: no-repeat;
    mask-position: center;
  }

  & .image-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    mask-image: url("/images/art_mask.png");
    mask-size: 160px 160px;
    mask-repeat: no-repeat;
    mask-position: center;
  }

  & .image-icon-hover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0;
    will-change: transform, opacity;
    z-index: 3;
  }

  & .name {
    position: absolute;
    color: transparent;
    bottom: 0;
    opacity: 0;
    transition:
      opacity 0.3s,
      color 0.3s;
    text-box-trim: trim-both;
    text-align: center;
    z-index: 4;
  }

  &:hover,
  &:focus-within {
    z-index: 10;
    .image {
      filter: var(--filter-url);
    }
    .image-bg {
      background: var(--theme-color);
      transform: rotate(v-bind(randomRotation));
      transition: transform 0.3s;
    }

    .image-icon-hover {
      opacity: 1;
      animation: bounceScale 0.3s ease;
    }
    .image-icon {
      opacity: 0;
    }

    .name {
      @include color-text-stroke(var(--background), 6px);
      opacity: 1;
      color: var(--theme-color);
    }
    .image-frame {
      animation: frameShrinkShake 0.3s ease forwards;
    }
  }
  &.interacted:not(:hover):not(:focus-within) {
    .image-icon {
      animation: bounceScaleMask 0.3s ease forwards;
    }
  }
}

@keyframes bounceScale {
  0%,
  100% {
    transform: none;
  }
  40% {
    transform: translateY(-2px);
  }
}
@keyframes bounceScaleMask {
  0% {
    background-position: center 6px;
  }
  100% {
    background-position: center 0;
  }
}
</style>
