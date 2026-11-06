<template>
  <div
    v-if="character"
    class="character-page"
    :style="{ '--theme-color': themeColor }"
  >
    <CharacterBanner :character="character" />
    <div class="character-content">
      <div class="character-main-content">
        <CharacterInfobox :character="character" />
        <h2 class="section-title">
          <span class="lotl-font" style="font-size: 1.2em">Description</span>
        </h2>
        <content-renderer :value="character" class="character-text" prose />
      </div>
    </div>
    <div class="character-images">
      <h2 class="section-title">
        <Icon
          icon="art_brush"
          width="36px"
          height="36px"
          style="color: var(--theme-color)"
        />
        <span class="lotl-font" style="font-size: 1.2em">Artwork</span>
      </h2>
      <ArtGrid
        v-if="characterArtworks && characterArtworks.length > 0"
        :artworks="characterArtworks"
        show-metadata
      />
      <div v-else class="no-artwork">
        <p>No artwork found for this character yet.</p>
      </div>
      <div
        v-if="characterArtworks && characterArtworks.length > 0"
        style="display: flex; justify-content: center; margin: 0.5rem 0"
      >
        <ActivityHeatmap :data="activityData" />
      </div>
    </div>
    <div class="character-comments">
      <h2 class="section-title">
        <span class="lotl-font" style="font-size: 1.2em">Comments</span>
      </h2>
      <CommentForm :slug="commentSlug" />
      <CommentSection :slug="commentSlug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import CharacterBanner from "~/components/characters/CharacterBanner.vue";
import CharacterInfobox from "~/components/characters/CharacterInfobox.vue";
import ArtGrid from "~/components/art/ArtGrid.vue";
import Icon from "~/components/common/Icon.vue";
import ActivityHeatmap from "~/components/home/ActivityHeatmap.vue";
import { useTheme } from "~/composables/useTheme";
import SplashText from "~/components/common/SplashText.vue";
import CommentForm from "~/components/comments/CommentForm.vue";
import CommentSection from "~/components/comments/CommentSection.vue";
import { computed } from "vue";

const route = useRoute();

const { data: character } = await useAsyncData(
  `character-${route.params.slug}`,
  () => {
    const slug = route.params.slug;
    return queryCollection("characters").where("slug", "=", slug).first();
  },
  {
    watch: [() => route.params.slug],
    server: true,
  },
);

// Redirect to 404 if character is not found
if (!character.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Character not found",
  });
}

// Character artwork loading
const { data: characterArtworks } = await useAsyncData(
  `character-artworks-${route.params.slug}`,
  async () => {
    if (!character.value) return [];
    return await getArtworksByCharacter(character.value.slug);
  },
  {
    watch: [() => route.params.slug],
    server: true,
  },
);

const activityData = computed(() => {
  const data: Record<string, { unit: string; count: number }[]> = {};
  if (characterArtworks.value) {
    for (const artwork of characterArtworks.value) {
      const date = artwork.created_at.slice(0, 10);
      if (!data[date]) data[date] = [];
      const unit = "artwork";
      const existing = data[date].find((a) => a.unit === unit);
      if (existing) {
        existing.count++;
      } else {
        data[date].push({ unit, count: 1 });
      }
    }
  }
  return data;
});

const { theme } = useTheme();

const themeColor = computed(() => {
  if (!character.value) return "#000000";

  // If theme is light (true), use light color if available
  if (theme.value && character.value.theme_color_light) {
    return character.value.theme_color_light;
  }
  // Otherwise use the default theme color
  return character.value.theme_color || "#000000";
});

const commentSlug = computed(() => `char:${character.value?.slug}`);

const updateScrollbarColor = () => {
  document.documentElement.style.setProperty(
    "--scrollbar-bar",
    themeColor.value,
  );
};

watch(themeColor, () => {
  updateScrollbarColor();
});

onMounted(() => {
  updateScrollbarColor();
});

onBeforeUnmount(() => {
  // Reset scrollbar color on unmount
  document.documentElement.style.setProperty(
    "--scrollbar-bar",
    "var(--primary)",
  );
});

useSeoMeta({
  title: character.value.name,
  description: character.value.short_description,
  ogTitle: character.value.name,
  ogDescription: `${character.value.species} ◆ ${character.value.pronouns} ◆ ${character.value.short_description}`,
  themeColor: themeColor.value || "#000000",
});
</script>

<style lang="scss" scoped>
@use "~/assets/styles/partials/mixins" as *;

.character-page {
  position: relative;
  min-height: 100vh;
}

.character-content,
.character-images,
.character-comments {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    /* On mobile, stack vertically */
    display: flex;
    flex-direction: column;
  }

  /* Clear floats after content */
  &::after {
    content: "";
    display: table;
    clear: both;
  }
}

.character-text {
  /* Text will naturally wrap around the floated infobox */
  text-align: left;

  @media (max-width: 768px) {
    order: 1;
  }

  :deep(p) {
    font-size: var(--base-text);
    margin: 1.2rem 0;
  }

  > :deep(h1),
  > :deep(h2),
  > :deep(h3),
  > :deep(h4),
  > :deep(h5),
  > :deep(h6) {
    font-weight: 800;
    line-height: 1.25;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--distant);
    display: flow-root;
  }

  > :deep(h1) {
    font-size: var(--xl-text);
  }

  > :deep(h2) {
    font-size: var(--large-text);
  }

  > :deep(h3) {
    font-size: var(--medium-text);
  }

  > :deep(h4) {
    font-size: var(--base-text);
  }

  > :deep(h5) {
    font-size: var(--small-text);
  }

  > :deep(h6) {
    font-size: var(--small-text);
    color: var(--text-secondary);
  }
}

.section-title {
  @include color-text-stroke(var(--theme-color), 6px);
  color: var(--background);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.no-posts {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}

.no-artwork {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.end-message {
  text-align: center;
  padding: 2rem;
  font-size: var(--base-text);
  color: var(--text-secondary);
  font-style: italic;
}
</style>
