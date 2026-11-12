<template>
  <div class="blog-page">
    <h1>echolotl's Blog</h1>
    <div v-if="allPinnedPosts && allPinnedPosts.length > 0" class="section-header">
      <h2 class="section-title">
        <Icon icon="pin" style="color: var(--text)" size="30px" />
        <span class="lotl-font" style="font-size: 1.2em">Pinned</span>
      </h2>
    </div>
    <div class="posts">
      <BlogItem v-for="post in allPinnedPosts" :key="post.slug" :post="post" />
    </div>
    <div v-if="allOtherPosts && allOtherPosts.length > 0" class="section-header">
      <h2 class="section-title">
        <Icon icon="lore" style="color: var(--text)" size="30px" />
        <span class="lotl-font" style="font-size: 1.2em">All Posts</span>
      </h2>
    </div>
    <div class="posts">
      <BlogItem v-for="post in allOtherPosts" :key="post.slug" :post="post" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlogCollectionItem } from "@nuxt/content";
import Icon from "~/components/ui/Icon.vue";


const { data: posts } = await useAsyncData<BlogCollectionItem[]>(
  "blog",
  () => {
    return queryCollection("blog").all();
  },
  {
    server: true,
  },
);

const allPinnedPosts = computed(() => posts.value?.filter(post => post.pinned) ?? []);
const allOtherPosts = computed(() => posts.value?.filter(post => !post.pinned) ?? []);
</script>

<style scoped lang="scss">
@use "~/assets/styles/util" as *;
.blog-page {
  margin: 0 auto;
  padding: 2rem;
  max-width: 1200px;
  min-height: 80vh;
  justify-content: center;
}
.posts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}
.section-title {
  @include color-text-stroke(var(--text), 6px);
  color: var(--background);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  text-box-trim:trim-end;
}
</style>
