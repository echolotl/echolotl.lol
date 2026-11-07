<template>
  <Tag
    variant="character"
    :to="`/characters/${slug}`"
    :custom-color="themeColor">
    <span v-if="character?.name" class="character-tag__name lotl-font">
      {{ character.name }}
    </span>
    <slot v-else></slot>
  </Tag>
</template>

<script setup lang="ts">
import Tag from "~/components/ui/Tag.vue";
import { useTheme } from "~/composables/useTheme.js";

interface Props {
  slug: string;
}

const props = defineProps<Props>();

const { data: character } = await useAsyncData(
  `character-tag-${props.slug}`,
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

  if (theme.value && character.value.theme_color_light) {
    return character.value.theme_color_light;
  }
  return character.value.theme_color || "";
});
</script>

<style scoped lang="scss">
.character-tag__name {
  transform: translateY(2px);
}
</style>
