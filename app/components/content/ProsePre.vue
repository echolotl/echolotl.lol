<template>
  <div class="prose-code">
    <div class="header">
      <span class="language">{{ language || "plaintext" }}</span>
      <span class="filename"
        ><b>{{ filename }}</b></span
      >
    </div>
    <div class="content">
      <pre :class="$props.class"><slot /></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  code: {
    type: String,
    default: "",
  },
  language: {
    type: String,
    default: null,
  },
  filename: {
    type: String,
    default: null,
  },
  highlights: {
    type: Array as () => number[],
    default: () => [],
  },
  meta: {
    type: String,
    default: null,
  },
  class: {
    type: String,
    default: null,
  },
});
</script>

<style scoped lang="scss">
.prose-code {
  background: var(--background);
  border: 1px solid var(--distant);
  width: fit-content;
  height: fit-content;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre;
  background: rgba(0, 0, 0, 0.05);
}
.header {
  display: flex;
  justify-content: space-between;
  font-size: var(--small-text);
  background-color: var(--distant);
  padding: 4px;
}
.content {
  padding: 0 8px;
}
</style>
