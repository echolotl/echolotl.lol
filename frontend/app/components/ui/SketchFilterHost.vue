<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style="position: absolute; width: 0; height: 0; overflow: hidden">
    <defs>
      <SketchFilterDefinition
        v-for="f in filters"
        :key="f.id"
        v-bind="f" />
    </defs>
  </svg>
</template>

<script setup lang="ts">
import type { SketchFilterDef } from "~/composables/useSketchFilter";
import SketchFilterDefinition from "~/components/ui/SketchFilterDefinition.vue";

const filters = useState<Record<string, SketchFilterDef>>(
  "sketch-filters",
  () => ({}),
);
</script>
