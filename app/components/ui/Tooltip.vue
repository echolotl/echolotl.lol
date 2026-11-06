<template>
  <div
    class="tooltip"
    :style="{ anchorName }"
    :data-direction="props.direction"
    :data-display-only="props.displayOnly || undefined"
    :data-instant="instant || undefined"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot></slot>
    <span class="tooltiptext" :style="{ positionAnchor: anchorName }">
      <slot name="text"></slot>
    </span>
  </div>
</template>

<script lang="ts">
// Shared across all tooltip instances
const INSTANT_WINDOW_MS = 150;
let lastLeaveTime = 0;
</script>

<script setup lang="ts">
const props = defineProps<{
  direction?: "top" | "bottom" | "left" | "right";
  displayOnly?: boolean; // The tooltip doesn't stay open after exiting the anchor element
}>();
// Unique per instance so each tooltip anchors to its own wrapper
const anchorName = `--tooltip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

// Skip the open/close animation when moving straight from another tooltip
const instant = ref(false);
function onEnter() {
  instant.value = Date.now() - lastLeaveTime < INSTANT_WINDOW_MS;
}
function onLeave() {
  lastLeaveTime = Date.now();
}
</script>

<style scoped>
.tooltip .tooltiptext {
  visibility: hidden;
  position: absolute;
  z-index: 10;
  --shift: translateX(-50%);
  width: max-content;
  background: var(--surface);
  padding: 2.5px 5px;
  border: 2px solid var(--distant);
  border-radius: 12px;
  opacity: 0;
  transform: var(--shift) scale(0.5);
  transition:
    opacity 0.3s,
    transform 0.3s;

  &:after {
    content: "";
    position: absolute;
    border-width: 5px;
    border-style: solid;
  }
  /** bigger hover area, bridging the gap to the anchor */
  &:before {
    content: "";
    position: absolute;
    inset: -10px;
  }
}

/* ignore pointer events so only the trigger keeps the tooltip open */
.tooltip[data-display-only] .tooltiptext {
  pointer-events: none;
}

.tooltip[data-instant] .tooltiptext {
  transition: none;
}

/* bottom (default) */
.tooltip:not([data-direction]) .tooltiptext,
.tooltip[data-direction="bottom"] .tooltiptext {
  top: anchor(bottom);
  left: anchor(center);
  margin-top: 2px;
  transform-origin: top center;
  &:after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-color: transparent transparent var(--distant) transparent;
  }
}

.tooltip[data-direction="top"] .tooltiptext {
  bottom: anchor(top);
  left: anchor(center);
  margin-bottom: 2px;
  transform-origin: bottom center;
  &:after {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-color: var(--distant) transparent transparent transparent;
  }
}

.tooltip[data-direction="left"] .tooltiptext {
  --shift: translateY(-50%);
  top: anchor(center);
  right: anchor(left);
  margin-right: 2px;
  transform-origin: center right;
  &:after {
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    border-color: transparent transparent transparent var(--distant);
  }
}

.tooltip[data-direction="right"] .tooltiptext {
  --shift: translateY(-50%);
  top: anchor(center);
  left: anchor(right);
  margin-left: 2px;
  transform-origin: center left;
  &:after {
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border-color: transparent var(--distant) transparent transparent;
  }
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
  transform: var(--shift) scale(1);
}

.tooltip:focus-within .tooltiptext {
  visibility: visible;
  opacity: 1;
  transform: var(--shift) scale(1);
}
</style>
