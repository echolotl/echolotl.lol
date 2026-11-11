<template>
  <div class="characters-page">
    <h1 class="large-title characters-title">Characters</h1>
    <p class="subtitle">
      Want to know more about my characters? Click on any of their cards to go
      to their page!
    </p>
    <div class="characters-content">
      <div
        v-for="(characters, category) in charactersCategories"
        :key="category"
        class="category">
        <h2 class="section-title" style="transform: translateY(2px)">
          <span class="lotl-font" style="font-size: 1.5rem">{{
            category
          }}</span>
        </h2>
        <p class="category-description">
          {{
            hardcodedCategoryDescriptions[category] ||
            "No description for this category yet."
          }}
        </p>
        <hr />
        <div class="characters-grid">
          <CharacterCard
            v-for="character in characters"
            :key="character.slug"
            :character="character"
            class="character-card" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from "nuxt/app";
import CharacterCard from "~/components/characters/CharacterCard.vue";
import { type Character } from "~~/types";

const { data: characters } = await useAsyncData<Character[]>(
  "characters",
  () => {
    return queryCollection("characters").all();
  },
  {
    server: true,
  },
);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

const sortedCharacters = computed(() => {
  if (!characters.value) return [];

  return [...characters.value].sort((a, b) => {
    const colorA = a.theme_color || "#000000";
    const colorB = b.theme_color || "#000000";

    const hslA = hexToHsl(colorA);
    const hslB = hexToHsl(colorB);

    return hslA.h - hslB.h;
  });
});

const charactersCategories = computed(() => {
  const categories: Record<string, Character[]> = {};
  sortedCharacters.value.forEach((char) => {
    const category = char.category || "Other";
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(char);
  });
  return categories;
});

const hardcodedCategoryDescriptions: Record<string, string> = {
  Main: "All of my main characters that all exist together",
  Sonas: "Characters created for echolotl as representations of themselves",
  Other: "Probably minor and/or possibly one-off characters",
};

useSeoMeta({
  title: "Characters",
  description:
    "A collection of all of echolotl's characters, mostly anthropomorphic animals of some kind, and of various species, personalities, and designs. All of these characters are original characters.",
  ogTitle: "echolotl's Characters",
  ogDescription: "A collection of all of echolotl's characters.",
});
</script>

<style scoped lang="scss">
.characters-page {
  margin: 0 auto;
  padding: 2rem;
  max-width: 1200px;
  min-height: 80vh;
  justify-content: center;
  h1 {
    text-align: center;
  }
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 150px);
  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    justify-content: center;
  }
}
.character-card {
  justify-self: center;
}

.characters-title {
  mask-image: url("/images/characters/title.webp");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  background-color: var(--text);
  height: 100px;
  width: 100%;
}

.subtitle {
  text-align: center;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  h2 {
    margin: 0;
  }
}
.category-description {
  font-size: var(--small-text);
  color: var(--text-secondary);
  margin: 0;
}
</style>
