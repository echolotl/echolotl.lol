<template>
  <div
    class="blog-item-container"
    :style="{
      '--filter-url': filterUrl,
    }"
    :class="post.category"
  >
    <div class="blog-item">
      <div class="category-label">
        <Icon
          :icon="CATEGORY_ICONS[post.category as BlogCategory]"
          size="1.25lh"
        />{{ post.category }}
      </div>

      <img
        v-if="post.thumbnail_url"
        class="thumbnail"
        :src="post.thumbnail_url"
        alt=""
        loading="lazy"
        decoding="async"
      />

      <div class="blog-item-content" :class="{ 'has-thumbnail': post.thumbnail_url }">
      <h2>
        <NuxtLink :to="`/blog/${post.slug}`" class="blog-item-link">
          {{ post.title }}
        </NuxtLink>
      </h2>
      <p class="description">{{ post.description }}</p>
      <div class="tag-lists">
        <div v-if="post.related_characters" class="metadata tags-section">
          <Icon icon="character" size="1.5lh" />
          <TagList>
            <CharacterTag
              v-for="character in post.related_characters"
              :key="character"
              :slug="character"
            />
          </TagList>
        </div>
        <div v-if="post.tags" class="metadata tags-section">
          <Icon icon="tag" size="1.5lh" />
          <TagList>
            <Tag v-for="tag in post.tags" :key="tag">
              {{ tag }}
            </Tag>
          </TagList>
        </div>
        <div class="tag-exclusion-zone" aria-hidden="true"></div>
      </div>
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

const CATEGORY_ICONS: Record<BlogCategory, string> = {
  lore: "changed",
  devlog: "site_update",
  announcement: "sound",
  general: "comment",
};
const { url: filterUrl } = useSketchFilter(() => ({
  color: "var(--surface)",
}));

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
  padding: 0.5rem;
  border-radius: 12px;
  position: relative;
  isolation: isolate;
  background: var(--surface);
  border: 2px dashed transparent;
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

  &:hover {
    border-color: rgba(from var(--color) r g b / 0.5);
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

  .thumbnail {
    display: block;
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 3px 3px 0 0;
    mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  }

  .metadata {
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    margin-top: 0.3rem;
  }

  .metadata-section {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--very-small-text);
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
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
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

.blog-item-content {
  padding: 0.25rem;
  &.has-thumbnail {
    padding: 0 0.25rem;
  }
}
</style>
