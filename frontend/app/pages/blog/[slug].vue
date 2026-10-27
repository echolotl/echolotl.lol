<template>
  <div v-if="post" class="blog-post">
    <h1>{{ post.title }}</h1>
    <p>{{ post.description }}</p>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();

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
