<template>
  <div class="gallery" v-if="art.images && art.images.length">
    <div class="viewer-container">
      <div class="viewer">
        <div class="image-wrapper">
          <img
            v-if="activeSource && activeImageDimensions"
            :src="activeSource.image_url"
            :alt="activeSource.alt"
            :width="activeImageDimensions.width"
            :height="activeImageDimensions.height"
            class="hero"
            :data-index="currentImageIndex"
            :data-variant="currentVariantIndex ?? 'base'"
            @error="
              imageLoadError = 'Could not load the selected artwork image.'
            "
          />
          <div v-else class="placeholder">
            <Icon icon="loading" size="3rem" />Loading...
          </div>
        </div>
      </div>
    </div>

    <!-- Variant selector for current base image -->
    <div
      v-if="currentImage?.variants && currentImage.variants.length"
      class="variants"
    >
      <div class="list">
        <Icon icon="layers" />
        <button
          type="button"
          class="chip"
          :class="{ active: currentVariantIndex === null }"
          :aria-pressed="currentVariantIndex === null"
          @click="currentVariantIndex = null"
        >
          Original
        </button>
        <button
          type="button"
          v-for="(variant, vIndex) in currentImage.variants"
          :key="vIndex"
          class="chip"
          :class="{ active: currentVariantIndex === vIndex }"
          :aria-pressed="currentVariantIndex === vIndex"
          @click="selectVariant(vIndex)"
        >
          {{ variant.label || "Alt " + (vIndex + 1) }}
        </button>
      </div>
    </div>

    <!-- Selector for multiple images -->
    <div v-if="hasMultiple" class="selector">
      <div class="dots">
        <button
          type="button"
          v-for="(_, index) in art.images"
          :key="index"
          class="selector-dot"
          :class="{ active: currentImageIndex === index }"
          :aria-label="`Show image ${index + 1} of ${art.images.length}`"
          :aria-pressed="currentImageIndex === index"
          @click="selectImage(index)"
        ></button>
      </div>
      <div class="label">
        <button
          type="button"
          class="nav prev"
          @click="prevImage"
          aria-label="Previous image"
          style="border-radius: 100%"
        >
          <Icon icon="small-arrow" style="transform: rotate(180deg)" />
        </button>
        <Icon icon="images" /> {{ currentImageIndex + 1 }} /
        {{ art.images.length }}
        <button
          type="button"
          class="nav next"
          @click="nextImage"
          aria-label="Next image"
          style="border-radius: 100%"
        >
          <Icon icon="small-arrow" />
        </button>
      </div>
    </div>
    <a
      class="label link"
      style="
        justify-content: center;
        cursor: pointer;
        width: fit-content;
        margin: 0 auto;
      "
      :href="activeSource?.image_url"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ activeSource?.image_url.split("/").pop() || "Untitled Image" }}
      <Icon icon="open-in-new" />
    </a>
    <p v-if="imageLoadError" role="alert" class="gallery-error">
      {{ imageLoadError }}
    </p>
    <p class="sr-only" role="status" aria-live="polite">
      {{ galleryStatus }}
    </p>
  </div>
  <div v-else class="gallery-empty">No images available.</div>
</template>

<script setup lang="ts">
import type { Art, ArtImage } from "~~/types";
import Icon from "~/components/ui/Icon.vue";

const props = defineProps<{ art: Art }>();

const currentImageIndex = ref(0);
const currentVariantIndex = ref<number | null>(null);
const imageDimensionsCache = ref<
  Map<string, { width: number; height: number }>
>(new Map());
const imageLoadError = ref("");

const hasMultiple = computed(() => (props.art.images?.length || 0) > 1);
const currentImage = computed<ArtImage | undefined>(
  () => props.art.images?.[currentImageIndex.value],
);

const activeSource = computed(() => {
  const base = currentImage.value;
  if (!base) return null;
  if (currentVariantIndex.value !== null && base.variants) {
    const maybe = base.variants[currentVariantIndex.value];
    if (maybe) {
      return {
        image_url: maybe.image_url,
        thumbnail_url: maybe.thumbnail_url || base.thumbnail_url,
        alt: maybe.alt || base.alt || props.art.title,
      };
    }
  }
  return {
    image_url: base.image_url,
    thumbnail_url: base.thumbnail_url,
    alt: base.alt || props.art.title,
  };
});

const activeImageDimensions = computed(() => {
  if (!activeSource.value) return null;
  return imageDimensionsCache.value.get(activeSource.value.image_url) || null;
});
const galleryStatus = computed(() => {
  if (!activeSource.value || !props.art.images?.length) return "";
  return `Image ${currentImageIndex.value + 1} of ${props.art.images.length}: ${activeSource.value.alt}`;
});

function loadImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    // Check cache first
    const cached = imageDimensionsCache.value.get(url);
    if (cached) {
      resolve(cached);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      imageDimensionsCache.value.set(url, dimensions);
      resolve(dimensions);
    };
    img.onerror = () => {
      const fallback = { width: 800, height: 600 };
      imageDimensionsCache.value.set(url, fallback);
      resolve(fallback);
    };
    img.src = url;
  });
}

async function preloadAllImages() {
  if (typeof window === "undefined") return;

  const urlsToLoad: string[] = [];

  props.art.images?.forEach((img) => {
    urlsToLoad.push(img.image_url);
    img.variants?.forEach((variant) => {
      urlsToLoad.push(variant.image_url);
    });
  });

  await Promise.all(urlsToLoad.map((url) => loadImage(url)));
}

function selectImage(index: number) {
  if (index < 0 || !props.art.images || index >= props.art.images.length)
    return;
  currentImageIndex.value = index;
  currentVariantIndex.value = null; // reset variant selection
  imageLoadError.value = "";
}

function selectVariant(vIndex: number) {
  currentVariantIndex.value = vIndex;
  imageLoadError.value = "";
}

function prevImage() {
  if (!props.art.images?.length) return;
  currentImageIndex.value =
    (currentImageIndex.value - 1 + props.art.images.length) %
    props.art.images.length;
  currentVariantIndex.value = null;
  imageLoadError.value = "";
}

function nextImage() {
  if (!props.art.images?.length) return;
  currentImageIndex.value =
    (currentImageIndex.value + 1) % props.art.images.length;
  currentVariantIndex.value = null;
  imageLoadError.value = "";
}

onMounted(() => {
  preloadAllImages();
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/util" as *;
.gallery {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gallery-error {
  color: var(--red);
}

.viewer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.viewer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.image-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 75vh;
  width: fit-content;
  height: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;

  .hero {
    max-height: 70vh;
    max-width: 100%;
    width: auto;
    height: auto;
    display: block;
    border: 3px dashed var(--distant);
  }
  .placeholder {
    display: flex;
    padding: 1rem;
    aspect-ratio: 1 / 1;
    flex-direction: row;
    gap: 0.25rem;
    font-size: var(--small-text);
    align-items: center;
    justify-content: center;
  }
  &:hover .view-original {
    opacity: 1;
  }
}

.view-original {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  opacity: 0;
  @include color-text-stroke(var(--background));
  .link {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.25rem;
  }
}

.selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  & .label {
    font-size: var(--base-text);
    color: var(--text-secondary);
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }
  & .dots {
    display: flex;
    gap: 0.2rem;
    align-items: center;
    .selector-dot {
      width: 0.75rem;
      height: 0.75rem;
      padding: 0;
      border-radius: 50%;
      background: var(--distant);
      border: 1px solid var(--surface);
      cursor: pointer;
      transition:
        background-color 0.2s ease,
        width 0.2s ease,
        border-radius 0.2s ease;
      &.active {
        background: var(--primary);
        width: 2rem;
        border-radius: 9999px;
      }
    }
  }
}

.variants {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  .list {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    color: var(--text-secondary);
  }
}

.gallery-empty {
  color: var(--text-secondary);
  font-style: italic;
}

.chip {
  border: 1px solid var(--distant);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: var(--very-small-text);
  cursor: pointer;
  transition: border-color 0.18s ease;
}
</style>
