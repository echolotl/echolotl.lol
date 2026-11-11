<template>
  <span
    v-if="icon"
    class="icon"
    :style="{
      '--icon-size': size,
      '--icon-color': color,
      '--icon-url': `url(/images/icons/${icon}.webp)`,
    }"
    :role="alt ? 'img' : undefined"
    :aria-hidden="alt ? undefined : 'true'"
    :aria-label="alt || undefined"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    size?: string;
    /** Any CSS color. */
    color?: string;
    alt?: string;
  }>(),
  {
    size: "24px",
    color: "currentColor",
    alt: "",
  },
);
</script>

<style scoped>
.icon {
  display: inline-block;
  flex-shrink: 0;
  width: var(--icon-size);
  height: var(--icon-size);
  background-color: var(--icon-color);
  mask: var(--icon-url) center / contain no-repeat;
}
</style>
