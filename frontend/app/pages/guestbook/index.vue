<template>
  <div class="guestbook-container" :style="containerStyle">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style="position: absolute; width: 0; height: 0; overflow: hidden"
    >
      <!-- this was generated from some website called nnnoise -->
      <defs>
        <filter
          id="nnnoise-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          color-interpolation-filters="linearRGB"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency="0.127"
            numOctaves="4"
            seed="15"
            stitchTiles="stitch"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="turbulence"
          ></feTurbulence>
          <feSpecularLighting
            surfaceScale="16"
            specularConstant="1.1"
            specularExponent="20"
            lighting-color="#0000ff"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="turbulence"
            result="specularLighting"
          >
            <feDistantLight azimuth="3" elevation="150"></feDistantLight>
          </feSpecularLighting>
          <feColorMatrix
            type="saturate"
            values="0"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="specularLighting"
            result="colormatrix"
          ></feColorMatrix>
        </filter>
      </defs>
    </svg>
    <canvas
      ref="guestbookCanvas"
      @mousedown.middle.prevent
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerLeave"
      @contextmenu.prevent
      @wheel="handleWheel"
    ></canvas>
    <div class="debug">
      Camera: {{ camera.x }}, {{ camera.y }}, Zoom: {{ camera.zoom }}
    </div>
  </div>
</template>

<style scoped>
.guestbook-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    filter: url("#nnnoise-filter");
    opacity: 0.25;
  }

  .debug {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: var(--background);
    padding: 4px 8px;
    font-size: 12px;
  }
}
canvas {
  width: 100%;
  height: 100%;
}
</style>

<script setup lang="ts">
import { CANVAS_COLORS, initializeCanvasColors } from "~/utils/constants";
const guestbookCanvas: Ref<HTMLCanvasElement | null> = ref(null);
const ctx: Ref<CanvasRenderingContext2D | null> = ref(null);
let camera: Camera = reactive({ x: 0, y: 0, zoom: 1 });
const heldPointer = ref<number | null>(null);
let lastPointerPosition = { x: 0, y: 0 };
let frame: number | null = null;
let backdrop: CanvasPattern | null = null;
let resizeObserver: ResizeObserver | undefined;

const { theme } = useTheme();

const MAX_ZOOM = 2;
const MIN_ZOOM = 0.5;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const containerStyle = computed(() => {
  if (heldPointer.value !== null) {
    return {
      cursor: "grabbing",
    };
  }
  return {
    cursor: "grab",
  };
});

function draw() {
  const canvas = guestbookCanvas.value;
  const context = ctx.value;
  if (
    canvas &&
    context &&
    canvas.clientWidth &&
    canvas.clientHeight &&
    CANVAS_COLORS
  ) {
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * pixelRatio);
    const height = Math.round(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      camera.zoom * scaleX,
      0,
      0,
      camera.zoom * scaleY,
      -camera.x * camera.zoom * scaleX,
      -camera.y * camera.zoom * scaleY,
    );
    createDotBackdrop(context, camera);
    context.fillStyle = backdrop || "transparent";
    context.fillRect(
      camera.x,
      camera.y,
      canvas.clientWidth / camera.zoom,
      canvas.clientHeight / camera.zoom,
    );
  }
}

function createDotBackdrop(context: CanvasRenderingContext2D, camera: Camera) {
  if (!CANVAS_COLORS || backdrop) return;
  const scaleX = context.canvas.width / context.canvas.clientWidth;
  const scaleY = context.canvas.height / context.canvas.clientHeight;
  const DOT_SIZE = 3;
  const DOT_SPACING = 32;

  // The texture will get bigger as the camera zooms in, so we scale it accordingly.
  const patternWidth = Math.max(
    DOT_SIZE + DOT_SPACING,
    Math.ceil(DOT_SIZE + DOT_SPACING * camera.zoom * scaleX),
  );
  const patternHeight = Math.max(
    DOT_SIZE + DOT_SPACING,
    Math.ceil((DOT_SIZE + DOT_SPACING) * camera.zoom * scaleY),
  );
  const patternCanvas = new OffscreenCanvas(
    patternWidth * 2,
    patternHeight * 2,
  );
  const patternContext = patternCanvas.getContext("2d");
  if (patternContext) {
    patternContext.scale(2, 2);
    patternContext.fillStyle = CANVAS_COLORS.gray;
    patternContext.beginPath();
    patternContext.arc(
      patternWidth / 2,
      patternHeight / 2,
      DOT_SIZE / 2,
      0,
      Math.PI * 2,
    );
    patternContext.fill();
  }
  const backdropPattern = context.createPattern(patternCanvas, "repeat");
  backdropPattern?.setTransform(new DOMMatrix().scale(0.5));
  backdrop = backdropPattern;
}

onMounted(() => {
  const canvas = guestbookCanvas.value;
  if (canvas) {
    const context = canvas.getContext("2d");
    ctx.value = context;
    initializeCanvasColors();
    scheduleDrawBoard();
    resizeObserver = new ResizeObserver(scheduleDrawBoard);
    resizeObserver.observe(canvas);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (frame !== null) cancelAnimationFrame(frame);
});

watch([theme], () => {
  initializeCanvasColors(true);
  backdrop = null;
  scheduleDrawBoard();
});

function handlePointerDown(event: PointerEvent) {
  // Implement pointer down logic here
  if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
  heldPointer.value = event.pointerId;
  lastPointerPosition = { x: event.clientX, y: event.clientY };
}

function handlePointerMove(event: PointerEvent) {
  if (heldPointer.value === event.pointerId && (event.buttons & 7) !== 0) {
    const dx = event.clientX - lastPointerPosition.x;
    const dy = event.clientY - lastPointerPosition.y;
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;
    lastPointerPosition = { x: event.clientX, y: event.clientY };
    scheduleDrawBoard();
  }
}

function handleWheel(event: WheelEvent) {
  const canvas = guestbookCanvas.value;
  if (
    !canvas ||
    !((event.button === 0 && event.ctrlKey) || (event.buttons & 4) !== 0)
  )
    return;

  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = ((event.clientX - rect.left) * canvas.clientWidth) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.clientHeight) / rect.height;
  const delta =
    event.deltaY *
    (event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? rect.height
        : 1);
  let zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, camera.zoom * Math.exp(-delta * 0.001)),
  );
  if ((camera.zoom < 1 && zoom >= 1) || (camera.zoom > 1 && zoom <= 1)) {
    zoom = 1;
  }

  camera.x += x / camera.zoom - x / zoom;
  camera.y += y / camera.zoom - y / zoom;
  camera.zoom = zoom;
  scheduleDrawBoard();
}

function handlePointerLeave(event: PointerEvent) {
  if (heldPointer.value === event.pointerId) {
    heldPointer.value = null;
  }
}
function handlePointerUp(event: PointerEvent) {
  if (heldPointer.value === event.pointerId) {
    heldPointer.value = null;
  }
}

function scheduleDrawBoard() {
  if (frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    draw();
  });
}
</script>
