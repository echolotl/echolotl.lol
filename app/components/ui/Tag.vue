<template>
  <NuxtLink v-if="to" :to="to" :class="tagClasses" :style="customStyles">
    <Icon v-if="icon" :icon="icon" :color="iconColor" />
    <slot></slot>
  </NuxtLink>
  <button
    v-else-if="clickable"
    type="button"
    :class="tagClasses"
    :style="customStyles">
    <Icon v-if="icon" :icon="icon" :color="iconColor" />
    <slot></slot>
  </button>
  <span v-else :class="tagClasses" :style="customStyles">
    <Icon v-if="icon" :icon="icon" :color="iconColor" />
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue";

interface Props {
  variant?: "default" | "character" | "more";
  icon?: string;
  iconColor?: string;
  clickable?: boolean;
  customColor?: string;
  to?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  clickable: false,
});

const tagClasses = computed(() => [
  "tag",
  props.variant,
  { interactive: props.clickable || Boolean(props.to) },
]);

const customStyles = computed(() => {
  if (props.customColor) {
    return {
      "--tag-color": props.customColor,
    };
  }
  return {};
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/_variables" as *;

.tag {
  --tag-color: var(--text-secondary);
  align-items: center;
  background: color-mix(in oklab, var(--tag-color) 8%, var(--background));
  border: 1px solid color-mix(in oklab, var(--tag-color) 32%, var(--distant));
  border-radius: 999px;
  color: var(--tag-color);
  display: inline-flex;
  font-size: var(--small-text);
  font-family: $body-font;
  font-weight: 400;
  gap: 0.25rem;
  line-height: 1;
  padding: 0.35rem 0.65rem;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &.default {
    text-transform: uppercase;
  }

  &.character {
    text-transform: none;
    text-decoration: none;
  }

  &.interactive {
    cursor: pointer;

    &:is(:hover, :focus-visible) {
      background: color-mix(in oklab, var(--tag-color) 18%, var(--background));
      border-color: var(--tag-color);
      color: var(--tag-color);
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid var(--tag-color);
      outline-offset: 2px;
    }
  }
}
</style>
