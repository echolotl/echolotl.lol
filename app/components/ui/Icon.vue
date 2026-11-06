<template>
  <div
    v-if="props.icon"
    :style="maskStyle"
    :class="{ invert: props.invert }"
    class="icon"
    :role="props.alt ? 'img' : undefined"
    :aria-hidden="props.alt ? undefined : 'true'"
    :aria-label="props.alt || undefined" />
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: "",
  },
  width: {
    type: String,
    default: "24px",
  },
  height: {
    type: String,
    default: "24px",
  },
  invert: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    default: "currentColor",
  },
  disableMask: {
    type: Boolean,
    default: false,
  },
});

const maskStyle = computed(() => {
  const style: Record<string, string> = {
    width: props.width,
    height: props.height,
    display: "inline-block",
    flexShrink: "0",
  };
  if (props.disableMask) {
    style.backgroundImage = `url(/images/icons/${props.icon}.webp)`;
    style.backgroundSize = "contain";
    style.backgroundRepeat = "no-repeat";
    style.backgroundPosition = "center";
  } else {
    style.maskImage = `url(/images/icons/${props.icon}.webp)`;
    style.WebkitMaskImage = `url(/images/icons/${props.icon}.webp)`;
    style.maskSize = "contain";
    style.WebkitMaskSize = "contain";
    style.maskRepeat = "no-repeat";
    style.WebkitMaskRepeat = "no-repeat";
    style.maskPosition = "center";
    style.WebkitMaskPosition = "center";
    style.backgroundColor = props.color;
  }
  return style;
});
</script>
