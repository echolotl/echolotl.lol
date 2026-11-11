<template>
  <div
    class="blog-item-container"
    :style="{
      '--filter-url': filterUrl,
    }"
    :class="post.category"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style="position: absolute; width: 0; height: 0; overflow: hidden"
    >
      <defs>
        <SketchFilterDefinition
          :id="filterId"
          color="var(--flood-color)"
          :std-deviation="2"
          :intercept="-5"
          :seed="1"
        />
      </defs>
    </svg>
    <div class="blog-item">
      <div class="category-label">
        <Icon
          :icon="CATEGORY_ICONS[post.category as BlogCategory]"
          size="1.25lh"
        />{{ post.category }}
      </div>

      <h2>
        <NuxtLink :to="`/blog/${post.slug}`" class="blog-item-link">
          {{ post.title }}
        </NuxtLink>
      </h2>
      <p class="description">{{ post.description }}</p>
      <div class="metadata">
        <div v-if="post.author" class="metadata-section text-secondary">
          <Icon icon="edit" size="1.25lh" />
          <span>{{ post.author }}</span>
        </div>
        <div class="metadata-section text-secondary">
          <Icon icon="date" size="1.25lh" />
          <span>{{ formatDate(new Date(post.created_at)) }}</span>
        </div>
      </div>
      <div class="tag-lists">
        <div class="metadata tags-section">
          <Icon icon="character" size="1.5lh" />
          <TagList :shouldTruncate="true">
            <CharacterTag
              v-for="character in post.related_characters"
              :key="character"
              :slug="character"
            />
          </TagList>
        </div>
        <div class="metadata tags-section">
          <Icon icon="tag" size="1.5lh" />
          <TagList :shouldTruncate="true">
            <Tag v-for="tag in post.tags" :key="tag">
              {{ tag }}
            </Tag>
          </TagList>
        </div>
        <div class="tag-exclusion-zone" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { formatDate } from "~/utils";
import type { BlogCollectionItem } from "@nuxt/content";
import Icon from "~/components/ui/Icon.vue";
import type { BlogCategory } from "~~/types/index.ts";
import Tag from "~/components/ui/Tag.vue";
import TagList from "~/components/ui/TagList.vue";
import CharacterTag from "~/components/characters/CharacterTag.vue";
import SketchFilterDefinition from "~/components/ui/SketchFilterDefinition.vue";

const CATEGORY_ICONS: Record<BlogCategory, string> = {
  lore: "changed",
  devlog: "site_update",
  announcement: "sound",
  general: "comment",
};

const filterId = `blog-sketch-${useId()}`;
const filterUrl = `url(#${filterId})`;

const props = defineProps<{
  post: BlogCollectionItem;
}>();
</script>
<style scoped>
.blog-item-link {
  text-decoration: none;
  color: inherit;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
  }
}
.blog-item {
  padding: 0.75rem;
  border-radius: 8px;
  position: relative;
  isolation: isolate;
  background: var(--surface);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: radial-gradient(
      100px circle at 95% 125%,
      var(--color),
      transparent
    );
    opacity: 0.25;
    pointer-events: none;
    transform-origin: bottom right;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }
  &:hover::before {
    opacity: 0.35;
  }

  .category-label {
    position: absolute;
    bottom: -8px;
    right: 8px;
    display: flex;
    align-items: center;
    background: var(--color);
    color: var(--surface);
    padding: 2px 6px;
    border-radius: 4px;
    gap: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .metadata {
    display: flex;
    gap: 0.5rem;
    font-size: var(--very-small-text);
    flex-direction: row;
  }

  .metadata-section {
    display: inline-flex;
    align-items: center;
    font-size: var(--very-small-text);
    gap: 0.25rem;
  }

  .tag-lists {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 4.5rem;
    row-gap: 0.25rem;
    margin-top: 0.25rem;
    align-items: center;
  }

  .tags-section {
    color: var(--text-secondary);
    position: relative;
    z-index: 1;
    min-inline-size: 0;
    gap: 0.25rem;
  }

  .tags-section:first-child {
    grid-column: 1 / -1;
  }

  .tags-section + .tags-section {
    grid-column: 1;
  }

  .tag-exclusion-zone {
    grid-column: 2;
    grid-row: 2;
    align-self: end;
    block-size: 2rem;
  }

  :deep(.tag-list) {
    flex: 1;
    min-inline-size: 0;
  }

  h2 {
    margin: 0;
  }
  .description {
    margin: 0.25rem 0;
    color: var(--text-secondary);
  }
}
.blog-item-container {
  position: relative;
  --color: var(--primary);
  --flood-color: var(--surface);
  filter: var(--filter-url);

  &.lore {
    --color: var(--purple);
  }
  &.devlog {
    --color: var(--blue);
  }
  &.announcement {
    --color: var(--orange);
  }

  &:hover {
    --flood-color: color-mix(in srgb, var(--color) 40%, var(--solid));
  }
}
</style>
