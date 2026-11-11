<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="modal-overlay"
      :aria-label="ariaLabel"
      @click.self="closeOnBackdrop && close()"
      @cancel="onCancel"
      @close="onDialogClose"
    >
      <div
        class="modal"
        :class="{ icon: props.icon }"
        :style="{ '--filter-url': filterUrl, maxWidth }"
      >
        <Icon
          v-if="props.icon"
          :icon="props.icon"
          class="icon"
          :color="props.iconColor"
          size="48px"
          aria-hidden="true"
        />
        <button
          v-if="props.closeButton"
          type="button"
          class="close"
          aria-label="Close dialog"
          @click="close()"
        >
          <Icon icon="close" size="28px" />
        </button>
        <div class="content">
          <slot />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import Icon from "~/components/ui/Icon.vue";

const props = withDefaults(
  defineProps<{
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    closeButton?: boolean;
    ariaLabel?: string;
    maxWidth?: string;
    outlineColor?: string;
    icon?: string;
    iconColor?: string;
  }>(),
  {
    closeOnBackdrop: true,
    closeOnEscape: true,
    ariaLabel: undefined,
    maxWidth: "600px",
    outlineColor: "var(--surface)",
    icon: undefined,
    iconColor: undefined,
    closeButton: true,
  },
);

const open = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { url: filterUrl } = useSketchFilter(() => ({
  color: props.outlineColor,
  stdDeviation: 1.5,
  intercept: -6,
}));
const dialogRef = ref<HTMLDialogElement | null>(null);
let shouldEmitClose = false;

function close() {
  if (!dialogRef.value?.open) return;
  shouldEmitClose = true;
  dialogRef.value.close();
}

function onCancel(event: Event) {
  if (!props.closeOnEscape) {
    event.preventDefault();
  } else {
    shouldEmitClose = true;
  }
}

function onDialogClose() {
  open.value = false;
  if (shouldEmitClose) {
    emit("close");
    shouldEmitClose = false;
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        if (dialogRef.value && !dialogRef.value.open) {
          dialogRef.value.showModal();
        }
      });
    } else if (dialogRef.value?.open) {
      dialogRef.value.close();
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.modal-overlay {
  &:not([open]) {
    display: none;
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }

  &[open] {
    display: flex;
    opacity: 1;
    transform: none;

    @starting-style {
      opacity: 0;
      transform: translateY(12px) scale(0.97);
    }
  }

  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: none;
  box-sizing: border-box;
  overflow: visible;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: transparent;
  color: inherit;
  overscroll-behavior: contain;
  transition-property: opacity, transform, display, overlay;
  transition-duration: 0.2s;
  transition-timing-function: ease;
  transition-behavior: allow-discrete;

  &::backdrop {
    overflow: hidden;
    background: transparent;
    overscroll-behavior: contain;
    transition-property: background-color, display, overlay;
    transition-duration: 0.2s;
    transition-timing-function: ease;
    transition-behavior: allow-discrete;
  }

  &[open]::backdrop {
    background: rgb(0 0 0 / 60%);

    @starting-style {
      background: transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.1s;

    &,
    &:not([open]) {
      transform: none;
    }
  }
}

.modal {
  & .close {
    position: absolute;
    top: -16px;
    right: -16px;
    background: none;
    border: none;
    border-radius: 9999px;
    aspect-ratio: 1 / 1;
    padding: 4px;
    cursor: pointer;
    &:hover {
      background: var(--surface);
    }
  }
  position: relative;
  width: 100%;
  max-height: 100%;
  display: flex;
  border: none;
  background: var(--surface);
  color: var(--text);
  filter: var(--filter-url);
  border-radius: 16px;

  & .content {
    flex: 1;
    min-width: 0;
    padding: 24px;
    overflow-y: auto;
  }
  & .icon {
    position: absolute;
    top: 8px;
    left: -32px;
  }

  // On narrow screens there's no room beside the box, so the icon
  // sits centered over its top edge
  @media (max-width: 768px) {
    & .icon {
      top: -24px;
      right: 24px;
      left: auto;
    }

    &.icon .content {
      padding-top: 16px;
    }
  }
}
</style>
