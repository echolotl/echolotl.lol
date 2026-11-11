<template>
  <div>
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <SketchFilterHost />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import SketchFilterHost from "~/components/ui/SketchFilterHost.vue";

const { fetchUser } = useAuth();

onMounted(() => {
  fetchUser();
});

useHead({
  meta: [{ name: "text-scale", content: "scale" }],
  script: [
    {
      src: "/script.js",
      "data-website-id": "77e4ea44-c716-4370-822b-c56b37406967",
      "data-host-url": "https://umami.echolotl.lol",
      defer: true,
    },
  ],
});
</script>
