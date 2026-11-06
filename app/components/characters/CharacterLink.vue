<template>
  <nuxt-link :to="`/characters/${slug}`" class="link character-link lotl-font">
    <slot v-if="$slots.default"></slot>
    <span v-else>{{ character?.name }}</span>
  </nuxt-link>
</template>

<script setup lang="ts">
import { useTheme } from "~/composables/useTheme";

const props = defineProps<{
  slug: string;
}>();

const { data: character } = await useAsyncData(
  `character-link-${props.slug}`,
  async () => {
    const character = await queryCollection("characters")
      .where("slug", "=", props.slug)
      .first();
    return character;
  },
  {
    server: true,
  },
);

const { theme } = useTheme();

const themeColor = computed(() => {
  if (!character.value) return "";

  // If theme is light (true), use light color if available
  if (theme.value && character.value.theme_color_light) {
    return character.value.theme_color_light;
  }
  // Otherwise use the default theme color
  return character.value.theme_color || "";
});

const darkerColor = computed(() => {
  if (!themeColor.value) return "";
  return `color-mix(in oklab, ${themeColor.value} 50%, black 50%)`;
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/_mixins" as *;

.character-link {
  color: v-bind(themeColor);
  text-box-trim: trim-both;
}
</style>
