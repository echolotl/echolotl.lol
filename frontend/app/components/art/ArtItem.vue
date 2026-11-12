<template>
  <div
    style="position: relative; display: flex; justify-content: center"
    class="art-item-container"
    :style="{ '--filter-url': filterUrl }"
  >
    <nuxt-link
      :to="`/art/${artwork.slug}`"
      class="art-item"
      :class="{ interacted: hasInteracted }"
      :aria-label="`View Artwork: ${artwork.title}`"
      @click="onClick"
      @mouseenter="hasInteracted = true"
      @focusin="hasInteracted = true"
    >
      <div
        class="image"
        :class="{ blurred: artwork.nsfw }"
        :style="{
          '--art-bg': `url(${artwork.images[0]?.thumbnail_url})`,
          backgroundImage: artwork.nsfw ? 'none' : 'var(--art-bg)',
        }"
        :title="artwork.title"
      >
        <div v-if="showMetadata" class="metadata">
          <div
            v-if="artwork.character && showCharacterBadge"
            class="metadata-icon"
            title="Character"
          >
            <Icon icon="character" />
          </div>
          <div v-if="artwork.pinned" class="metadata-icon" title="Pinned">
            <Icon icon="pin" />
          </div>
          <div v-if="artwork.sketch" class="metadata-icon" title="Sketch">
            <Icon icon="sketch" />
          </div>
          <div v-if="hasVariants" class="metadata-icon" title="Has Variants">
            <Icon icon="layers" />
          </div>
          <div
            v-if="hasMultipleImages"
            class="metadata-icon"
            title="Multiple Images"
          >
            <Icon icon="images" />
          </div>
          <div
            v-if="!isEcholotlArtwork(props.artwork)"
            class="metadata-icon"
            title="Non-echolotl Artwork"
          >
            <Icon icon="other" />
          </div>
          <div v-if="artwork.nsfw" class="metadata-icon" title="NSFW Content">
            <Icon icon="r18" />
          </div>
        </div>
      </div>
    </nuxt-link>
  </div>
</template>

<script setup lang="ts">
import type { Art } from "~~/types";
import Icon from "~/components/ui/Icon.vue";
import { useAgeVerification } from "../../composables/useAgeVerification.js";

const props = defineProps<{
  artwork: Art;
  showMetadata?: boolean;
  showCharacterBadge?: boolean;
  /** Concrete color for the hover border; defaults to the primary color. */
  outlineColor?: string;
}>();

const emit = defineEmits<{ (e: "age-gate"): void }>();

const hasInteracted = ref(false);
const { verified } = useAgeVerification();
const locked = computed(() => !!props.artwork.nsfw && !verified.value);

function onClick(event: MouseEvent) {
  if (!locked.value) return;
  event.preventDefault();
  emit("age-gate");
}
const { url: filterUrl } = useSketchFilter(() => ({
  color: props.outlineColor,
}));

const hasVariants = computed(() => {
  return (props.artwork.images?.[0]?.variants?.length || 0) > 0;
});

const hasMultipleImages = computed(() => {
  return (props.artwork.images?.length || 0) > 1;
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/util" as *;

.art-item {
  display: flex;
  position: relative;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
  width: 100%;
  aspect-ratio: 1;
  max-width: 150px;
  transform-origin: center;
  transition: transform 0.3s ease-out;
  will-change: transform filter;
  outline: none;

  & .image {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background-size: 110%;
    background-position: center;
    background-repeat: no-repeat;
    mask-image: url("/images/art_mask.png");
    mask-size: cover;
    mask-repeat: no-repeat;
    background-color: var(--surface);
    z-index: -1;
    will-change: background-size;
    transition: background-size 0.3s ease-out;

    // Blur only the artwork layer so the metadata badges stay sharp
    &.blurred::before {
      content: "";
      position: absolute;
      inset: -20px;
      background: var(--art-bg) center / cover no-repeat;
      filter: blur(4px);
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover,
  &:focus-within {
    transform: scale(1.1);

    .image {
      background-size: 100%;
    }
    .metadata {
      color: var(--background);
      &::before {
        background: var(--theme-color);
      }
    }
  }

  &.interacted:not(:hover):not(:focus-within) {
    animation: bounceInScale 0.3s;
    .image {
      animation: bounceInBackground 0.3s;
    }
  }
}
.art-item-container {
  &:hover,
  &:focus-within {
    filter: var(--filter-url);
  }
}
.metadata {
  position: absolute;
  display: flex;
  color: var(--theme-color);
  align-items: flex-start;
  justify-content: left;
  transition: filter 0.2s ease;
  z-index: 2;
  width: auto;
  height: auto;
  padding-left: 2%;
  padding-top: 2%;
  padding-right: 2%;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background-blend-mode: darken;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--background);
    z-index: -3;
    border-radius: 0.5rem 0 0 0;
    corner-shape: superellipse(1.2);
    border: none;
  }

  &-icon {
    pointer-events: auto;
  }
}

@keyframes bounceInScale {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.975);
  }
}

@keyframes bounceInBackground {
  0%,
  100% {
    background-size: 110%;
  }
  50% {
    background-size: 111.26%;
  }
}
</style>
