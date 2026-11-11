<template>
  <div class="input-modes">
    <button
      v-for="{ mode, definition } in modes"
      :key="mode"
      :class="{ active: grid?.inputMode === mode }"
      :disabled="disabled"
      :aria-label="`${mode.charAt(0).toUpperCase()}${mode.slice(1)} mode`"
      :aria-pressed="grid?.inputMode === mode"
      @click="grid?.setInputMode(mode)"
      class="round"
    >
      <Icon :icon="definition.icon" size="20px" />
    </button>
  </div>
  <div class="input-modes">
    <button
      :disabled="!grid?.canUndo"
      @click="grid?.undo()"
      class="round"
      aria-label="Undo"
    >
      <Icon icon="undo" size="20px" />
    </button>
    <button
      :disabled="!grid?.canRedo"
      @click="grid?.redo()"
      class="round"
      aria-label="Redo"
    >
      <Icon icon="redo" size="20px" />
    </button>
  </div>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
import type PicrossGrid from "~/components/picross/PicrossGrid.vue";
import { getInputModes, type InputMode } from "~/utils/picross";

const props = defineProps<{
  grid: InstanceType<typeof PicrossGrid> | null;
  disabled?: boolean;
  removeModes?: InputMode[];
  addModes?: InputMode[];
}>();

const modes = computed(() =>
  getInputModes(props.removeModes, props.addModes),
);
</script>

<style scoped>
.input-modes {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--surface);
  border-radius: 8px;
  > button {
    background: none;
    border: none;
    padding: 2px;
    border-radius: 4px;

    &.active {
      background: var(--foreground);
    }
  }
}
</style>
