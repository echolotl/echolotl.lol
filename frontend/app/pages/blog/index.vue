<template>
  <div class="blog-page">
    <h1>echolotl's Blog</h1>
    <div class="posts">
      <BlogItem v-for="post in posts" :key="post.slug" :post="post" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlogCollectionItem } from "@nuxt/content";

const { data: posts } = await useAsyncData<BlogCollectionItem[]>(
  "blog",
  () => {
    return queryCollection("blog").all();
  },
  {
    server: true,
  },
);
</script>

<style scoped>
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
  gap: 2rem;
}
</style>
