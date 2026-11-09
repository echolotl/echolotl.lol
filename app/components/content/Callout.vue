<template>
  <div :class="['callout']" :style="{ '--callout-color': color }">
    <div
      class="icon"
      :style="{ '--filter-url': filterUrl }">
      <Icon
        :icon="iconName"
        style="color: var(--callout-color)"
        size="32px" />
    </div>
    <div class="content">
      <h4
        v-if="title"
        class="title lotl-font"
        style="color: var(--callout-color)">
        {{ title }}
      </h4>
      <div class="body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
interface Props {
  type?: "info" | "warning" | "error" | "tip";
  title?: string;
  icon?: string;
  color?: string;
}

const { url: filterUrl } = useSketchFilter({
  color: "var(--background)",
  stdDeviation: 1.5,
  intercept: -3,
});

const props = withDefaults(defineProps<Props>(), {
  type: "info",
  title: undefined,
  icon: undefined,
  color: undefined,
});

const iconName = computed(() => {
  if (props.icon) return props.icon;

  const icons = {
    info: "info",
    warning: "warning",
    error: "md-danger",
    tip: "tip",
    important: "feedback",
  };
  return icons[props.type];
});

const title = computed(() => {
  if (props.title) return props.title;

  const titles = {
    info: "Note",
    warning: "Warning",
    error: "Caution",
    tip: "Tip",
    important: "Important",
  };
  return titles[props.type];
});

const color = computed(() => {
  if (props.color) return props.color;

  const colors = {
    info: "var(--primary)",
    warning: "var(--orange)",
    error: "var(--red)",
    tip: "var(--green)",
    important: "var(--purple)",
  };
  return colors[props.type];
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/partials/_mixins" as *;

.callout {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-left: 3px dotted var(--callout-color);
  margin: 16px 0;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 48px;
    height: 100%;
    background: linear-gradient(to right, var(--callout-color), transparent);
    opacity: 0.1;
    z-index: -1;
  }
}

.icon {
  position: absolute;
  left: -24px;
  top: 8px;
  filter: var(--filter-url);
}

.title {
  margin: 0 0 8px 0 !important;
  font-size: 1.2em !important;
  color: var(--text);
}

.content {
  flex: 1;
}

.body {
  color: var(--text);

  > :deep(p) {
    margin: 0;
  }
}
</style>
