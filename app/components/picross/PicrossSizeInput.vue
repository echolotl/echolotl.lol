<template>
  <div class="size-inputs" style="color: var(--text-secondary)">
    <Icon icon="size" width="24px" height="20px" />
    <input
      v-model.number="draft.width"
      type="number"
      :min="MIN_BOARD_SIZE"
      :max="MAX_BOARD_SIZE"
      aria-label="Board width"
      @change="commit"
    />
    <span aria-hidden="true">⨯</span>
    <input
      v-model.number="draft.height"
      type="number"
      :min="MIN_BOARD_SIZE"
      :max="MAX_BOARD_SIZE"
      aria-label="Board height"
      @change="commit"
    />
  </div>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";
import { clampPicrossSize, type PicrossSize } from "~/utils/picross";

const props = defineProps<{ modelValue: PicrossSize }>();
const emit = defineEmits<{ "update:modelValue": [size: PicrossSize] }>();

const draft = reactive<PicrossSize>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (size) => {
    draft.width = size.width;
    draft.height = size.height;
  },
  { deep: true },
);

// Emits only once the user commits a value, so typing never resizes midway
function commit() {
  const size = clampPicrossSize(draft);
  draft.width = size.width;
  draft.height = size.height;
  emit("update:modelValue", size);
}
</script>

<style scoped>
.size-inputs {
  display: flex;
  align-items: center;
  gap: 4px;

  input[type="number"] {
    background: var(--surface);
    color: var(--text);
    border: none;
    padding: 4px;
    font-family: inherit;
    text-align: center;
    font-weight: bold;
    border-radius: 6px;
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
}
</style>
