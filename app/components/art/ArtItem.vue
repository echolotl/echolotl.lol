<template>
  <div
    style="position: relative; display: flex; justify-content: center"
    class="art-item-container"
    :style="{ '--filter-url': `url(#${filterId})` }"
  >
    <SketchFilter :id="filterId" />
    <nuxt-link
      :to="`/art/${artwork.slug}`"
      class="art-item"
      :aria-label="`View Artwork: ${artwork.title}`"
      @click="onClick"
    >
      <div
        class="art-item__image"
        :class="{ 'art-item__image--blurred': artwork.nsfw }"
        :style="{
          '--art-bg': `url(${artwork.images[0]?.thumbnail_url})`,
          backgroundImage: artwork.nsfw ? 'none' : 'var(--art-bg)',
        }"
        :title="artwork.title"
      >
        <div v-if="showMetadata" class="art-item__metadata">
          <div
            v-if="artwork.character && showCharacterBadge"
            class="art-item__metadata-icon"
            title="Character"
          >
            <Icon icon="character" />
          </div>
          <div
            v-if="artwork.pinned"
            class="art-item__metadata-icon"
            title="Pinned"
          >
            <Icon icon="pin" />
          </div>
          <div
            v-if="artwork.sketch"
            class="art-item__metadata-icon"
            title="Sketch"
          >
            <Icon icon="sketch" />
          </div>
          <div
            v-if="hasVariants"
            class="art-item__metadata-icon"
            title="Has Variants"
          >
            <Icon icon="layers" />
          </div>
          <div
            v-if="hasMultipleImages"
            class="art-item__metadata-icon"
            title="Multiple Images"
          >
            <Icon icon="images" />
          </div>
          <div
            v-if="!isEcholotlArtwork(props.artwork)"
            class="art-item__metadata-icon"
            title="Non-echolotl Artwork"
          >
            <Icon icon="other" />
          </div>
          <div
            v-if="artwork.nsfw"
            class="art-item__metadata-icon"
            title="NSFW Content"
          >
            <Icon icon="r18" />
          </div>
        </div>
      </div>
    </nuxt-link>
  </div>
</template>

<script setup lang="ts">
import type { Art } from "~~/types";
import SketchFilter from "~/components/ui/SketchFilter.vue";
import Icon from "~/components/ui/Icon.vue";
import { useAgeVerification } from "../../composables/useAgeVerification.js";

const props = defineProps<{
  artwork: Art;
  showMetadata?: boolean;
  showCharacterBadge?: boolean;
}>();

const emit = defineEmits<{ (e: "age-gate"): void }>();

const { verified } = useAgeVerification();
const locked = computed(() => !!props.artwork.nsfw && !verified.value);

function onClick(event: MouseEvent) {
  if (!locked.value) return;
  event.preventDefault();
  emit("age-gate");
}
const filterId = ref(`outline-${props.artwork.slug}`);

onMounted(() => {
  filterId.value = `outline-${props.artwork.slug}-${Math.random().toString(36).slice(2)}`;
});

const hasVariants = computed(() => {
  return (props.artwork.images?.[0]?.variants?.length || 0) > 0;
});

const hasMultipleImages = computed(() => {
  return (props.artwork.images?.length || 0) > 1;
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/_mixins" as *;

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

  &__image {
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
    &--blurred::before {
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

    .art-item__image {
      background-size: 100%;
    }
    .art-item__metadata {
      color: var(--background);
      &::before {
        background: var(--theme-color, var(--primary));
      }
    }
  }

  &:not(:hover):not(:focus-within) {
    animation: bounceInScale 0.3s;
    .art-item__image {
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
.art-item__metadata {
  position: absolute;
  display: flex;
  color: var(--theme-color, var(--primary));
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
