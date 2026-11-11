<template>
  <Callout
    v-if="isAlert"
    class="callout-alert"
    :type="calloutType"
    :title="calloutTitle">
    <slot />
  </Callout>
  <blockquote v-else v-bind="attrs">
    <slot />
  </blockquote>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

type CalloutType = "info" | "warning" | "error" | "success";

const classes = computed(() => {
  const classValue = attrs.class;

  if (Array.isArray(classValue)) {
    return classValue.flatMap((entry) =>
      String(entry).split(/\s+/).filter(Boolean),
    );
  }

  if (!classValue) {
    return [];
  }

  return String(classValue).split(/\s+/).filter(Boolean);
});

const alertKind = computed(() => {
  const marker = classes.value.find(
    (item) => item.startsWith("markdown-alert-") && item !== "markdown-alert",
  );

  return marker?.replace("markdown-alert-", "") ?? null;
});

const isAlert = computed(() => {
  return classes.value.includes("markdown-alert") && !!alertKind.value;
});

const calloutType = computed<CalloutType>(() => {
  const map: Record<string, CalloutType> = {
    note: "info",
    important: "info",
    tip: "success",
    warning: "warning",
    caution: "error",
  };

  return map[alertKind.value ?? ""] ?? "info";
});

const calloutTitle = computed(() => {
  const title = alertKind.value ?? "info";
  return title.charAt(0).toUpperCase() + title.slice(1);
});
</script>

<style scoped lang="scss">
.callout-alert :deep(.markdown-alert-title) {
  display: none;
}

.callout-alert :deep(svg.octicon) {
  display: none;
}
</style>
