<template>
  <div class="character-infobox">
    <div class="character-infobox__label">
      <span
        class="lotl-font character-infobox__name"
        style="font-size: 1.4em; text-transform: uppercase"
        >{{ character.name.toUpperCase() }}</span
      >
      <span class="character-infobox__pronunciation">
        <span
          style="
            font-size: var(--very-small-text);
            color: var(--text-secondary);
          ">
          /{{ character.ipa }}/
        </span>
        <button
          v-if="character.ipa"
          type="button"
          class="character-infobox__audio-button"
          :title="`Play ${character.name}'s pronunciation`"
          @click="playPronunciation">
          <Icon icon="sound" size="16px" alt="" />
        </button>
      </span>
    </div>
    <div class="character-infobox__details">
      <hr v-if="character.image" />
      <div v-if="character.image" class="character-infobox__header">
        <figure
          style="text-align: center; margin: 0"
          v-if="characterImage[0] == false">
          <img
            :src="characterImage[1]"
            :alt="character.image_description || character.name"
            @click="
              character.image?.type == 'artwork'
                ? navigateTo(`/art/${character.image?.slug}`)
                : null
            " />
          <figcaption style="color: var(--text-secondary)">
            <i>{{
              character.image_description || "no description available"
            }}</i>
          </figcaption>
        </figure>
        <div v-else>
          <Icon icon="loading" size="48px" />
        </div>
      </div>
      <hr />
      <div
        v-if="character.color_palette"
        class="character-color-palette-container">
        <Icon
          :icon="paletteIcon"
          size="24px"
          @mouseenter="isPaletteIconHovered = true"
          @mouseleave="isPaletteIconHovered = false"
          @click="openPaletteImage"
          style="cursor: pointer" />
        <div class="character-color-palette">
          <div
            v-for="color in character.color_palette"
            :key="color"
            class="swatch"
            :style="{
              backgroundColor: color,
              '--swatch-border-color': passesContrast(color, '#ffffff')
                ? '#999'
                : '#333',
            }"
            @click="copyColorToClipboard(color)"
            @mouseenter="hoveredColor = color"
            @mouseleave="hoveredColor = null"></div>
        </div>
      </div>
      <table class="character-infobox__table">
        <tbody>
          <tr>
            <td class="character-infobox__item-label">
              <span>Species</span>
            </td>
            <td>
              {{ character.species || "Unknown" }}
            </td>
          </tr>

          <tr>
            <td class="character-infobox__item-label">
              <span>Pronouns</span>
            </td>
            <td>
              {{ character.pronouns || "Unknown" }}
            </td>
          </tr>

          <tr>
            <td class="character-infobox__item-label">
              <span>Age</span>
            </td>
            <td>{{ character.age || "Unknown" }}</td>
          </tr>

          <tr>
            <td class="character-infobox__item-label">
              <span>Height</span>
            </td>
            <td>
              <b>{{ character.height }}</b>
              <span>({{ formatMetricLength(character.height) }})</span>
            </td>
          </tr>

          <tr v-if="character.likes && character.likes.length > 0">
            <td class="character-infobox__item-label">
              <span>Likes</span>
            </td>
            <td>
              <ul class="character-list">
                <li v-for="like in character.likes" :key="like">
                  {{ like }}
                </li>
              </ul>
            </td>
          </tr>

          <tr v-if="character.dislikes && character.dislikes.length > 0">
            <td class="character-infobox__item-label">
              <span>Dislikes</span>
            </td>
            <td>
              <ul class="character-list">
                <li v-for="dislike in character.dislikes" :key="dislike">
                  {{ dislike }}
                </li>
              </ul>
            </td>
          </tr>

          <tr v-if="character.friends && character.friends.length > 0">
            <td class="character-infobox__item-label">
              <span>Friends</span>
            </td>
            <td>
              <ul class="character-list">
                <li v-for="friend in character.friends" :key="friend.slug">
                  <NuxtLink
                    :to="`/characters/${friend.slug}`"
                    class="character-link"
                    >{{ friend.name }}</NuxtLink
                  >
                </li>
              </ul>
            </td>
          </tr>

          <tr v-if="character.enemies && character.enemies.length > 0">
            <td class="character-infobox__item-label">
              <span>Enemies</span>
            </td>
            <td>
              <ul class="character-list">
                <li v-for="enemy in character.enemies" :key="enemy.slug">
                  <NuxtLink
                    :to="`/characters/${enemy.slug}`"
                    class="character-link"
                    >{{ enemy.name }}</NuxtLink
                  >
                </li>
              </ul>
            </td>
          </tr>

          <tr>
            <td class="character-infobox__item-label">
              <span>Creation Date</span>
            </td>
            <td>
              {{ formatDate(new Date(character.created_at)) || "Unknown" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
import type { Character } from "~~/types";

const props = defineProps<{
  character: Character;
}>();

const hoveredColor = ref<string | null>(null);
const copiedColor = ref<string | null>(null);
const isPaletteIconHovered = ref(false);
const pronunciationAudio = ref<HTMLAudioElement | null>(null);

const formatMetricLength = (feetString: string) => {
  const cm = feetStringToCm(feetString);
  if (cm >= 1000) {
    return `${(cm / 100).toFixed(1)}m`;
  }
  return `${cm}cm`;
};

const paletteIcon = computed(() => {
  if (copiedColor.value) {
    return "check";
  }
  if (isPaletteIconHovered.value) {
    return "open-in-new";
  }
  if (hoveredColor.value) {
    return "copy";
  }
  return "palette";
});

const characterImage = ref<[boolean, string]>([true, ""]); // [loading, url]

function playPronunciation(): void {
  if (!props.character.ipa) return;

  if (!pronunciationAudio.value) {
    pronunciationAudio.value = new Audio(
      `/sounds/pronunciations/${props.character.slug}.wav`,
    );
  }

  pronunciationAudio.value.currentTime = 0;
  void pronunciationAudio.value.play().catch((error: unknown) => {
    console.error("Unable to play character pronunciation audio:", error);
  });
}

onBeforeUnmount(() => {
  pronunciationAudio.value?.pause();
  pronunciationAudio.value = null;
});

onMounted(async () => {
  if (props.character.image) {
    if (
      props.character.image.type === "artwork" &&
      props.character.image.slug
    ) {
      // If it's an artwork, we need to query the collection to get the image URL
      const artwork = await getArtworkBySlug(props.character.image.slug);
      if (artwork) {
        characterImage.value = [
          false,
          artwork.images[0]?.image_url || `/images/no_image.png`,
        ];
        return;
      }
    }
    if (props.character.image.type === "url" && props.character.image.url) {
      characterImage.value = [false, props.character.image.url];
      return;
    }
  } else {
    characterImage.value = [false, ``];
  }
});

function openPaletteImage(): void {
  if (props.character.slug) {
    window.open(`/images/palettes/${props.character.slug}.png`, "_blank");
  }
}

function copyColorToClipboard(color: string): void {
  navigator.clipboard.writeText(color);
  copiedColor.value = color;
  setTimeout(() => {
    copiedColor.value = null;
  }, 2000);
}
</script>

<style lang="scss" scoped>
@use "~/assets/styles/partials/mixins" as *;

.character-infobox {
  float: right;
  width: 300px;
  margin-left: 20px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    float: none;
    width: 100%;
    margin: 0 0 20px 0;
    order: -1; /* Places infobox above content on mobile */
  }
}

.character-infobox__label {
  @include color-text-stroke(var(--background), 4px);
  color: var(--theme-color);
  font-size: var(--base-text);
  padding: 0 0.75rem;
  margin-bottom: 5px;
  max-width: 100%;
  display: inline-block;
  text-align: right;
  display: flex;
  align-items: center;
  position: relative;
}

.character-infobox__name {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.character-infobox__pronunciation {
  position: absolute;
  bottom: 115%;
  left: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
}

.character-infobox__audio-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: var(--theme-color);
  }
}

.character-infobox__item-label {
  font-weight: bold;
  font-size: var(--small-text);
  box-sizing: border-box;
  text-transform: uppercase;
  white-space: nowrap;
  align-self: baseline;
  span {
    background: var(--theme-color);
    padding: 2px 4px;
    border-radius: 4px;
    color: var(--solid);
    corner-shape: superellipse(1.3);
  }
}

.character-infobox__details {
  position: relative;
  padding: 10px;
  font-size: var(--small-text);
  line-height: 1.5;
  color: var(--text);
  border: 1px solid var(--distant);
  border-top: 2px solid var(--theme-color);
  background-color: rgb(
    from var(--background) calc(r * 0.9) calc(g * 0.9) calc(b * 0.9)
  );
  &::before {
    background: radial-gradient(
      at left bottom,
      color-mix(in srgb, var(--theme-color) 50%, transparent 75%),
      transparent 60%
    );
    content: "";
    height: 24px;
    left: 0;
    position: absolute;
    top: -26px;
    width: 100%;
    z-index: -9999;
  }
}

.character-infobox__title {
  color: var(--theme-color);
  font-size: var(--large-text);
  margin-bottom: 10px;
  display: block;
  font-weight: 900;
  text-align: center;
}

.character-infobox__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
  img {
    max-width: 100%;
    height: auto;
    max-height: 300px;
  }
}

.character-color-palette-container {
  width: 100%;
  height: 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  margin: 0.25rem;
}

.character-color-palette {
  width: 100%;
  height: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  border: 2px solid var(--distant);
  .swatch {
    position: relative;
    flex: 1;
    height: 100%;
    &:hover {
      &::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(100% - 4px);
        height: calc(100% - 4px);
        outline: 2px solid var(--swatch-border-color);
        pointer-events: none;
        mix-blend-mode: luminosity;
      }
    }
  }
}

.character-infobox__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 10px;
  tr {
    border-radius: 2px;
    &:nth-child(even) {
      background-color: color-mix(in srgb, var(--theme-color) 5%, transparent);
    }
    td {
      padding: 6px 4px;
      vertical-align: baseline;
      &:last-child {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
}

.character-infobox__clan-icon {
  width: 24px;
  height: 24px;
}
.character-list {
  list-style: "-   ";
  padding: 0;
  margin: 0;
  .character-link {
    display: inline-block;
    color: var(--theme-color);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
      color: var(--theme-color);
    }
  }
}
</style>
