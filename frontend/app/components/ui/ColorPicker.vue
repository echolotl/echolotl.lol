<template>
  <div class="color-picker">
    <canvas
      ref="colorWheel"
      :width="WHEEL_SIZE"
      :height="WHEEL_SIZE"
      :style="{ filter: `brightness(${color.v})` }"
    ></canvas>
    <svg
      class="color-chooser-overlay"
      :width="WHEEL_SIZE + 2 * WHEEL_OFFSET"
      :height="WHEEL_SIZE + 2 * WHEEL_OFFSET"
      tabindex="0"
      role="slider"
      aria-label="Color hue and saturation"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(color.s * 100)"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @keydown="handleWheelKeydown"
      @blur="usingPointer = false"
      :class="{ dragging, 'pointer-focus': usingPointer }"
    >
      <circle
        class="wheel-hit-area"
        :cx="WHEEL_SIZE / 2 + WHEEL_OFFSET"
        :cy="WHEEL_SIZE / 2 + WHEEL_OFFSET"
        :r="WHEEL_SIZE / 2"
        fill="transparent"
        stroke="var(--distant)"
        stroke-width="3"
      />
      <circle
        class="chooser-handle"
        :cx="chooserCenter.x"
        :cy="chooserCenter.y"
        r="7.5"
        :fill="hexColor"
        stroke="var(--distant)"
        stroke-width="3"
      />
    </svg>
    <div
      class="brightness-slider"
      role="slider"
      tabindex="0"
      aria-label="Brightness"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(color.v * 100)"
      aria-orientation="horizontal"
      :class="{ 'pointer-focus': usingPointer }"
      @blur="usingPointer = false"
      @pointerdown="handleSliderPointerDown"
      @pointermove="handleSliderPointerMove"
      @pointerup="handleSliderPointerUp"
      @pointercancel="handleSliderPointerUp"
      @keydown="handleBrightnessKeydown"
    >
      <div class="track" :style="{ background: trackGradient }"></div>
      <div
        class="thumb"
        :style="{ left: color.v * 100 + '%', background: hexColor }"
      ></div>
    </div>
    <input
      class="color-input"
      type="text"
      maxlength="7"
      spellcheck="false"
      aria-label="Color hex value"
      :value="draft"
      @input="handleHexInput"
      @blur="handleHexBlur"
    />
  </div>
</template>

<script setup lang="ts">
import {
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
  hexToRgb,
  type HSVColor,
} from "~/utils/color";
import { onMounted, ref, watch } from "vue";

const colorWheel = ref<HTMLCanvasElement | null>(null);

const WHEEL_SIZE = 175;
const WHEEL_OFFSET = 10;

// The color picker always gives back a hex color value
const color = ref<HSVColor>({ h: 0, s: 0, v: 1 });
const hexColor = computed(() => {
  return rgbToHex(hsvToRgb(color.value));
});

// Position relative to the wheel's top-left; defaults to the center
const colorChooserPosition = ref<{ x: number; y: number }>({
  x: WHEEL_SIZE / 2,
  y: WHEEL_SIZE / 2,
});

// The SVG extends WHEEL_OFFSET past the wheel on every side
const chooserCenter = computed(() => ({
  x: colorChooserPosition.value.x + WHEEL_OFFSET,
  y: colorChooserPosition.value.y + WHEEL_OFFSET,
}));

// Track fades from the current hue/saturation at full brightness to black
const trackGradient = computed(() => {
  const bright = rgbToHex(hsvToRgb({ ...color.value, v: 1 }));
  return `linear-gradient(to right, #000 0%, ${bright} 100%)`;
});

// Focus outlines are for keyboard use only; hidden while interacting by pointer
const usingPointer = ref(false);

let heldPointerId: number | null = null;
// Keeps the custom cursor while dragging outside the wheel
const dragging = ref(false);
let heldSliderPointerId: number | null = null;

const model = defineModel<string>({ default: "#ffffff" });

// The text input is different from the actual color
const draft = ref(hexColor.value);
let editing = false;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Inverse of getColorFromPosition; hue 240 (blue) is at the bottom of the wheel
function getPositionFromColor({ h, s }: { h: number; s: number }) {
  const radius = WHEEL_SIZE / 2;
  const angle = ((h - 150) * Math.PI) / 180;
  return {
    x: radius + Math.cos(angle) * s * radius,
    y: radius + Math.sin(angle) * s * radius,
  };
}

function setColorFromHex(hex: string) {
  const hsv = rgbToHsv(hexToRgb(hex));
  // Black and grays have no meaningful hue/saturation, so keep the current ones
  const h = hsv.s === 0 || hsv.v === 0 ? color.value.h : hsv.h;
  const s = hsv.v === 0 ? color.value.s : hsv.s;
  color.value = { h, s, v: hsv.v };
  colorChooserPosition.value = getPositionFromColor({ h, s });
}

function handleHexInput(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim();
  editing = true;
  draft.value = value;
  if (HEX_PATTERN.test(value)) setColorFromHex(value);
}

function handleHexBlur() {
  editing = false;
  draft.value = hexColor.value;
}

watch(hexColor, (hex) => {
  if (!editing) draft.value = hex;
  if (model.value !== hex) model.value = hex;
});

watch(
  model,
  (value) => {
    if (value && value !== hexColor.value && HEX_PATTERN.test(value)) {
      setColorFromHex(value);
    }
  },
  { immediate: true },
);

function drawColorWheel() {
  const canvas = colorWheel.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WHEEL_SIZE * dpr;
  canvas.height = WHEEL_SIZE * dpr;
  const radius = canvas.width / 2;
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - radius;
      const dy = y - radius;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      // Blue at the bottom at 240 degrees hue
      const hue = ((((angle * 180) / Math.PI + 150) % 360) + 360) % 360;
      const saturation = Math.min(distance / radius, 1);
      const rgb = hsvToRgb({ h: hue, s: saturation, v: 1 });
      const index = (y * canvas.width + x) * 4;
      image.data[index] = rgb.r;
      image.data[index + 1] = rgb.g;
      image.data[index + 2] = rgb.b;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function getColorFromPosition(position: { x: number; y: number }): HSVColor {
  // Position is relative to the top-left of the wheel, in CSS pixels
  const radius = WHEEL_SIZE / 2;
  const dx = position.x - radius;
  const dy = position.y - radius;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const saturation = Math.min(distance / radius, 1);
  const angle = Math.atan2(dy, dx);
  const hue = ((((angle * 180) / Math.PI + 150) % 360) + 360) % 360;
  return { h: hue, s: saturation, v: color.value.v };
}

function updateFromPointer(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  const radius = WHEEL_SIZE / 2;
  let dx = event.clientX - rect.left - radius - WHEEL_OFFSET;
  let dy = event.clientY - rect.top - radius - WHEEL_OFFSET;
  // Keep the chooser inside the wheel
  const distance = Math.hypot(dx, dy);
  if (distance > radius) {
    dx = (dx / distance) * radius;
    dy = (dy / distance) * radius;
  }
  const position = { x: radius + dx, y: radius + dy };
  colorChooserPosition.value = position;
  color.value = getColorFromPosition(position);
}

function handlePointerDown(event: PointerEvent) {
  usingPointer.value = true;
  heldPointerId = event.pointerId;
  dragging.value = true;
  (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  updateFromPointer(event);
}

function handlePointerMove(event: PointerEvent) {
  if (heldPointerId !== event.pointerId) return;
  updateFromPointer(event);
}

function handlePointerUp(event: PointerEvent) {
  if (heldPointerId !== event.pointerId) return;
  heldPointerId = null;
  dragging.value = false;
}

function setBrightness(value: number) {
  color.value = { ...color.value, v: Math.min(Math.max(value, 0), 1) };
}

function handleWheelKeydown(event: KeyboardEvent) {
  usingPointer.value = false;
  const step = event.shiftKey ? 10 : 2;
  switch (event.key) {
    case "ArrowUp":
      color.value = {
        ...color.value,
        s: Math.min(1, color.value.s + step / 100),
      };
      break;
    case "ArrowDown":
      color.value = {
        ...color.value,
        s: Math.max(0, color.value.s - step / 100),
      };
      break;
    case "ArrowLeft":
      color.value = { ...color.value, h: (color.value.h - step + 360) % 360 };
      break;
    case "ArrowRight":
      color.value = { ...color.value, h: (color.value.h + step) % 360 };
      break;
    default:
      return;
  }
  colorChooserPosition.value = getPositionFromColor(color.value);
  event.preventDefault();
}

function handleBrightnessKeydown(event: KeyboardEvent) {
  usingPointer.value = false;
  const step = event.shiftKey ? 0.1 : 0.01;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowDown":
      setBrightness(color.value.v - step);
      break;
    case "ArrowRight":
    case "ArrowUp":
      setBrightness(color.value.v + step);
      break;
    case "Home":
      setBrightness(0);
      break;
    case "End":
      setBrightness(1);
      break;
    default:
      return;
  }
  event.preventDefault();
}

function updateBrightnessFromPointer(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  // Right end of the slider is full brightness
  setBrightness((event.clientX - rect.left) / rect.width);
}

function handleSliderPointerDown(event: PointerEvent) {
  usingPointer.value = true;
  heldSliderPointerId = event.pointerId;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  updateBrightnessFromPointer(event);
}

function handleSliderPointerMove(event: PointerEvent) {
  if (heldSliderPointerId !== event.pointerId) return;
  updateBrightnessFromPointer(event);
}

function handleSliderPointerUp(event: PointerEvent) {
  if (heldSliderPointerId !== event.pointerId) return;
  heldSliderPointerId = null;
}

onMounted(() => {
  drawColorWheel();
});

onBeforeUnmount(() => {
  heldPointerId = null;
  heldSliderPointerId = null;
});
</script>

<style>
.color-chooser {
  position: absolute;
  pointer-events: none;
}
.color-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 175px;
  padding: 8px;
}
.color-picker canvas {
  display: block;
  clip-path: circle(50%);
}
.color-chooser-overlay {
  position: absolute;
  top: -2px;
  left: -2px;
  touch-action: none;
}
.color-chooser-overlay .wheel-hit-area,
.color-chooser-overlay .chooser-handle,
.color-chooser-overlay.dragging {
  cursor:
    url("/images/icons/add.webp") 8 8,
    auto;
}

.brightness-slider {
  position: relative;
  flex-shrink: 0;
  width: 175px;
  height: 20px;
  margin-top: 8px;
  touch-action: none;
  cursor: pointer;
}
.brightness-slider .track {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  border-radius: 9999px;
  width: 100%;
  border: 2px solid var(--distant);
}
.brightness-slider .thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 24px;
  border-radius: 9999px;
  border: 2px solid var(--distant);
  pointer-events: none;
  transition: none;
  transition: border-color 0.2s ease;
}

.color-picker [role="slider"]:focus:not(:focus-visible),
.color-picker [role="slider"].pointer-focus:focus {
  outline: none;
}

.color-input {
  font-family: inherit;
  line-height: 1;
  width: 100%;
  font-size: var(--small-text);
  text-align: center;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  color: var(--text-secondary);

  &:focus,
  &:active {
    outline: none;
    border-bottom-color: var(--distant);
  }
}
</style>
