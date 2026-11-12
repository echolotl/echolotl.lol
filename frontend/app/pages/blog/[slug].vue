<template>
  <div v-if="post" class="blog-page" :class="post.category">
    <header class="blog-header">
      <h1 class="large-title title" style="margin-bottom: 0rem; line-height: 1.2; text-align: center; ">
        <span class="lotl-font" style="font-size: 3rem">{{ post.title }}</span>
      </h1>
      <div class="blog-meta">
          <TagList
            v-if="post.tags && post.tags.length > 0"
            icon="tag"
            :items="post.tags"
            class="tag-list"
          >
            <Tag v-for="tag in post.tags" :key="tag">{{ tag }}</Tag>
          </TagList>

          <TagList
            v-if="post.related_characters && post.related_characters.length > 0"
            icon="character"
            :items="post.related_characters"
          >
            <CharacterTag
              v-for="character in post.related_characters"
              :key="character"
              :slug="character"
            />
          </TagList>

          <div v-if="post.created_at" class="section">
            <Icon icon="date" color="var(--text-secondary)" />
            <span class="date">{{ formatDate(new Date(post.created_at)) }}</span>
          </div>

          <div v-if="post.author" class="section">
            <Icon icon="edit" color="var(--text-secondary)" />
            <span class="date">by {{ post.author }}</span>
          </div>
          <div class="category-badge">
            <Icon
              :icon="CATEGORY_ICONS[post.category as BlogCategory]"
              size="1.25lh"
            />
            <span>{{ post.category }}</span>
          </div>
        </div>
      <hr style="margin-top: 0.5rem" />
    </header>
    <content-renderer :value="post" class="blog-content" prose />
  </div>
</template>
<script setup lang="ts">
import type { BlogCategory } from "~~/types/index.ts";
import CharacterTag from "~/components/characters/CharacterTag.vue";
import Icon from "~/components/ui/Icon.vue";
import Tag from "~/components/ui/Tag.vue";
import TagList from "~/components/ui/TagList.vue";
import { formatDate } from "~/utils";

const route = useRoute();

const CATEGORY_ICONS: Record<BlogCategory, string> = {
  lore: "changed",
  devlog: "site_update",
  announcement: "sound",
  general: "comment",
};

const { data: post } = await useAsyncData(
  `post-${route.params.slug}`,
  () => {
    const slug = route.params.slug;
    return queryCollection("blog").where("slug", "=", slug).first();
  },
  {
    watch: [() => route.params.slug],
    server: true,
  },
);
</script>

<style scoped lang="scss">
@use '~/assets/styles/util' as *;
.blog-page {
  min-height: 100vh;
  padding: 2rem;
  margin-top: 32px;
  --color: var(--primary);

  &.lore {
    --color: var(--purple);
  }

  &.devlog {
    --color: var(--blue);
  }

  &.announcement {
    --color: var(--orange);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 300px;
    background: radial-gradient(1000px 150px at center top, var(--color), transparent);
    opacity: 0.5;
    z-index: -1;
  }
}

.title {
  @include color-text-stroke(var(--background), 8px)
}

.blog-header {
  max-width: 1200px;
  margin: 0 auto 2rem;
}

.blog-description {
  color: var(--text-secondary);
  font-size: var(--base-text);
  line-height: 1.6;
  margin: 0.5rem 0 1rem;
}

.blog-meta {
  margin: 0.75rem 0;
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag-list {
  display: inline-flex;
}

.date {
  color: var(--text-secondary);
  font-size: var(--small-text);
}

.category-badge {
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

.blog-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
