<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        ref="overlayRef"
        class="modal-overlay"
        @click.self="closeOnBackdrop && close()"
      >
        <div
          ref="boxRef"
          class="modal"
          :class="{ 'modal--icon': props.icon }"
          role="dialog"
          aria-modal="true"
          :aria-label="ariaLabel"
          tabindex="-1"
          :style="{ '--filter-url': filterUrl, maxWidth }"
        >
          <Icon
            v-if="props.icon"
            :icon="props.icon"
            class="modal__icon"
            :color="props.iconColor"
            size="48px"
            aria-hidden="true"
          />
          <button
            v-if="props.closeButton"
            type="button"
            class="modal__close"
            aria-label="Close dialog"
            @click="close()"
          >
            <Icon icon="close" size="28px" />
          </button>
          <div class="modal__content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
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
const boxRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
let opener: HTMLElement | null = null;
let appContent: HTMLElement | null = null;

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function close() {
  open.value = false;
  emit("close");
}

function onKeydown(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === "Escape") {
    close();
    return;
  }

  if (event.key !== "Tab" || !boxRef.value) return;
  const focusable = Array.from(
    boxRef.value.querySelectorAll<HTMLElement>(focusableSelector),
  );
  if (focusable.length === 0) {
    event.preventDefault();
    boxRef.value.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  open,
  (isOpen) => {
    if (!import.meta.client) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      appContent = document.querySelector<HTMLElement>("[data-app-content]");
      appContent?.setAttribute("inert", "");
      window.addEventListener("keydown", onKeydown);
      nextTick(() => {
        boxRef.value?.focus();
      });
    } else {
      window.removeEventListener("keydown", onKeydown);
      appContent?.removeAttribute("inert");
      appContent = null;
      nextTick(() => opener?.focus());
      opener = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
  appContent?.removeAttribute("inert");
});
</script>

<style scoped lang="scss">
.modal-overlay {
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
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(0 0 0 / 60%);
}

.modal {
  &__close {
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

  &__content {
    flex: 1;
    min-width: 0;
    padding: 24px;
    overflow-y: auto;
  }
  &__icon {
    position: absolute;
    top: 8px;
    left: -32px;
  }

  // On narrow screens there's no room beside the box, so the icon
  // sits centered over its top edge
  @media (max-width: 768px) {
    &__icon {
      top: -24px;
      right: 24px;
      left: auto;
    }

    &--icon &__content {
      padding-top: 16px;
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;

  .modal {
    transition: transform 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal {
    transform: translateY(12px) scale(0.97);
  }
}
</style>
