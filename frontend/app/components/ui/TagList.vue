<template>
  <div v-if="shouldShow" class="tag-list">
    <Icon v-if="icon" :icon="icon" color="var(--text-secondary)" />
    <div class="items">
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
.tag-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  .icon {
    flex-shrink: 0;
    align-self: flex-start;
  }
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
}
</style>
