<template>
  <div
    class="blog-item-container"
    :style="{
      '--filter-url': `url(#post-${post.slug})`,
    }"
    :class="post.category"
  >
    <SketchFilter :id="`post-${post.slug}`" flood-color="var(--flood-color)" />
    <div class="blog-item">
      <div class="category-label">
        <Icon
          :icon="CATEGORY_ICONS[post.category as BlogCategory]"
          width="16px"
          height="16px"
        />{{ post.category }}
      </div>

      <h2>
        <NuxtLink :to="`/blog/${post.slug}`" class="blog-item-link">
          {{ post.title }}
        </NuxtLink>
      </h2>
      <p class="description">{{ post.description }}</p>
      <div class="metadata">
        <div class="metadata-section text-secondary">
          <Icon icon="edit" width="24px" height="24px" />
          <span>{{ post.author }}</span>
        </div>
        <div class="metadata-section text-secondary">
          <Icon icon="date" width="24px" height="24px" />
          <span>{{ formatDate(new Date(post.created_at)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { formatDate } from "~/utils";
import type { BlogCollectionItem } from "@nuxt/content";
import Icon from "../common/Icon.vue";
import SketchFilter from "../common/SketchFilter.vue";
import type { BlogCategory } from "~~/types/index.ts";
import Tag from "../common/Tag.vue";
import TagList from "../common/TagList.vue";
import CharacterTag from "../common/CharacterTag.vue";

const CATEGORY_ICONS: Record<BlogCategory, string> = {
  lore: "changed",
  devlog: "site_update",
  announcement: "sound",
  general: "comment",
};

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
    flex-direction: row;
  }

  .metadata-section {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tags-section {
    position: relative;
    z-index: 1;
    width: fit-content;
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
