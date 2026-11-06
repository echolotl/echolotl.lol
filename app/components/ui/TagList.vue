<template>
  <div v-if="shouldShow" class="tag-list">
    <Icon v-if="icon" :icon="icon" color="var(--text-secondary)" />
    <div class="tag-list__items flex-row-wrap">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue";

interface Props {
  icon?: string;
  items?: any[];
}

const props = defineProps<Props>();

const shouldShow = computed(() => {
  return props.items ? props.items.length > 0 : true;
});
</script>

<style scoped lang="scss">
/* Tag list items now use .flex-row-wrap utility class from _reusables.scss */
.tag-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .icon {
    flex-shrink: 0;
    align-self: flex-start;
  }
}
</style>
