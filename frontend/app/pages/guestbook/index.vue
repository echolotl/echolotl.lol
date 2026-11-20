<template>
  <div class="guestbook-container">
    <canvas
      ref="guestbookCanvas"
      :style="canvasStyle"
      aria-label="Guestbook drawing canvas"
      @mousedown.middle.prevent
      @pointerenter="updateBrushCursor"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="hideBrushCursor"
      @pointercancel="endPointer"
      @lostpointercapture="endPointer"
      @contextmenu.prevent
      @wheel="handleWheel"
    ></canvas>
    <div
      v-if="inputMode === 'select' && selectedPath && !pointer.active"
      class="selection-actions input-modes"
      :style="selectionActionsStyle"
    >
      <button
        type="button"
        aria-label="Move selection up a layer"
        :disabled="selectedPaths.some((path) => path.layer === LAYER_COUNT)"
        @click="moveSelectionLayer(1)"
      >
        <Icon icon="layer-up" size="20px" />
      </button>
      <button
        type="button"
        aria-label="Move selection down a layer"
        :disabled="selectedPaths.some((path) => path.layer === 1)"
        @click="moveSelectionLayer(-1)"
      >
        <Icon icon="layer-down" size="20px" />
      </button>
      <button
        type="button"
        aria-label="Delete selection"
        :disabled="!selectedPath"
        @click="deleteSelection"
      >
        <Icon icon="trash" size="20px" />
      </button>
    </div>
    <div class="side-panels">
      <div class="vertical-actions-row">
        <div
          v-if="inputMode !== 'select'"
          class="vertical-actions input-modes"
          role="group"
          aria-label="Drawing layer"
        >
          <button
            type="button"
            class="round"
            aria-label="Use Pen Pressure"
            :disabled="!!pointer.active"
            :class="{ active: usePenPressure }"
            @click="usePenPressure = !usePenPressure"
          >
            <Icon icon="pen-pressure" size="20px" />
          </button>
        </div>
        <div
          class="vertical-actions input-modes"
          role="group"
          aria-label="Drawing layer"
        >
          <button
            v-for="index in LAYER_COUNT"
            :key="index"
            type="button"
            :class="{ active: activeLayer === LAYER_COUNT - index + 1 }"
            :aria-label="`Layer ${LAYER_COUNT - index + 1}`"
            :aria-pressed="activeLayer === LAYER_COUNT - index + 1"
            :disabled="!!pointer.active"
            @click="selectLayer(LAYER_COUNT - index + 1)"
          >
            <Icon
              v-if="LAYER_COUNT - index + 1 <= 3"
              :icon="`layer-${LAYER_COUNT - index + 1}`"
              size="20px"
            />
            <span v-else>{{ LAYER_COUNT - index + 1 }}</span>
          </button>
        </div>
      </div>

      <div class="tool-properties">
        <details open>
          <summary class="lotl-font">Tool Properties</summary>
          <div v-if="inputMode === 'draw'">
            <label for="brush-color">Color</label>
            <div style="display: flex; justify-content: center">
              <ColorPicker id="brush-color" v-model="brushColor" horizontal />
            </div>
          </div>
          <div v-else-if="inputMode === 'select' && selectedPath">
            <label for="selection-color">Selection color</label>
            <div style="display: flex; justify-content: center">
              <ColorPicker
                id="selection-color"
                :model-value="selectedPath.color"
                horizontal
                @update:model-value="setSelectionColor"
                @interaction-start="beginSelectionColorChange"
                @interaction-end="endSelectionColorChange"
              />
            </div>
          </div>
          <div v-else-if="inputMode === 'select'">
            <p>Nothing selected.</p>
          </div>
          <div v-if="inputMode !== 'select'">
            <label for="brush-size">Brush size</label>
            <div class="property">
              <output for="brush-size" class="lotl-font">{{
                brushSize
              }}</output>
              <input
                id="brush-size"
                v-model.number="brushSize"
                type="range"
                min="1"
                max="100"
                :disabled="!!pointer.active"
              />
            </div>
          </div>
        </details>
      </div>
    </div>
    <div class="toolbar">
      <div class="coordinates lotl-font">
        ({{ viewportCenter.x.toFixed(2) }}, {{ viewportCenter.y.toFixed(2) }})
      </div>
      <div style="display: flex; gap: 6px">
        <div class="input-modes">
          <button
            v-for="mode in inputModes"
            :key="mode.value"
            type="button"
            class="round"
            :class="{ active: inputMode === mode.value }"
            :aria-label="`${mode.label} mode`"
            :aria-pressed="inputMode === mode.value"
            :disabled="!!pointer.active"
            @click="setInputMode(mode.value)"
          >
            <Icon :icon="mode.icon" size="20px" />
          </button>
        </div>
        <div class="input-modes">
          <button
            type="button"
            class="round"
            aria-label="Undo"
            :disabled="!canUndo || !!pointer.active"
            @click="undo"
          >
            <Icon icon="undo" size="20px" />
          </button>
          <button
            type="button"
            class="round"
            aria-label="Redo"
            :disabled="!canRedo || !!pointer.active"
            @click="redo"
          >
            <Icon icon="redo" size="20px" />
          </button>
        </div>
        <div class="input-modes" role="group" aria-label="Zoom">
          <button
            type="button"
            :disabled="!!pointer.active || camera.zoom === MAX_ZOOM"
            aria-label="Zoom in"
            @click="zoom(-200)"
          >
            <Icon icon="zoom-in" size="20px" />
          </button>
          <button
            type="button"
            :disabled="!!pointer.active || camera.zoom === MIN_ZOOM"
            aria-label="Zoom out"
            @click="zoom(200)"
          >
            <Icon icon="zoom-out" size="20px" />
          </button>
          <div class="zoom-level lotl-font">
            {{ (camera.zoom * 100).toFixed(0) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guestbook-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;

  .guestbook-status {
    position: absolute;
    top: 64px;
    left: 8px;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    background: var(--surface);
    border-radius: 4px;
    padding: 6px 8px;
    &:empty {
      display: none;
    }
  }

  .debug {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: var(--background);
    padding: 4px 8px;
    font-size: 12px;
    pointer-events: none;
  }

  .toolbar {
    position: absolute;
    bottom: 8px;
    left: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .side-panels {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: min(250px, calc(100% - 16px));
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .vertical-actions {
    flex-direction: column;
  }

  .selection-actions {
    position: absolute;
    flex-direction: column;
    z-index: 1;
  }

  .tool-properties {
    box-sizing: border-box;
    width: 100%;
    background: var(--surface);
    border-radius: 4px;
    padding: 6px 8px;
    > details summary {
      color: var(--text-secondary);
      text-transform: uppercase;
      font-size: var(--small-text);
      text-box-trim: trim-end;
    }

    > details[open] summary {
      margin-bottom: 4px;
    }

    label {
      flex: 1;
      text-transform: uppercase;
      font-weight: bold;
      color: var(--text-secondary);
    }

    .property {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;

      .property-label {
        margin-top: 8px;
      }

      input[type="range"] {
        flex: 1;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      }
      output {
        width: 3ch;
      }
    }
  }

  .input-modes {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: var(--surface);
    border-radius: 8px;
    align-items: center;

    button {
      background: none;
      border: none;
      padding: 2px;
      border-radius: 4px;

      &.active {
        background: var(--foreground);
      }
    }
  }
}

.vertical-actions-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 6px;
}

.zoom-level {
  font-size: var(--very-small-text);
  color: var(--text-secondary);
  padding-right: 2px;
}
canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
}
.coordinates {
  display: flex;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--small-text);
}
</style>

<script setup lang="ts">
import { initializeCanvasColors } from "~/utils/constants";
import { FlashishDrawing, type BrushSegment } from "@echolotl/flashish";
import {
  createCanvasRenderer,
  type Camera,
  type InputMode,
  type Point,
  type RenderedPath,
} from "~/utils/canvas";
import Icon from "~/components/ui/Icon.vue";
import ColorPicker from "~/components/ui/ColorPicker.vue";

const guestbookCanvas: Ref<HTMLCanvasElement | null> = ref(null);
const ctx: Ref<CanvasRenderingContext2D | null> = ref(null);

const camera: Camera = reactive({ x: 0, y: 0, zoom: 1 });
const canvasSize = reactive({ width: 0, height: 0 });
const viewportCenter = computed(() => ({
  x: camera.x + canvasSize.width / (2 * camera.zoom),
  y: camera.y + canvasSize.height / (2 * camera.zoom),
}));

const pointer = reactive<{
  position: { clientX: number; clientY: number } | null;
  active: Pointer | null;
}>({ position: null, active: null });
let heldButton = 0;

let resizeObserver: ResizeObserver | undefined;

const brushSize = ref(5);
const brushColor = ref("#ffffff");

let drawing: FlashishDrawing;
let pathDraft: (BrushSegment & { path: Path2D })[] = [];
const committedPaths = shallowRef<RenderedPath[]>([]);

const activeLayer = ref(2);

const inputModes = [
  { value: "draw", label: "Draw", icon: "edit" },
  { value: "erase", label: "Erase", icon: "erase" },
  { value: "select", label: "Select", icon: "select" },
] as const;
const inputMode = ref<InputMode>("draw");

const selectedPathIds = ref<number[]>([]);
let selectionOrigins = new Map<number, Point>();
let selectionColorChange: { kind: string; token: object } | null = null;
const selectedPaths = computed(() =>
  committedPaths.value.filter(({ id }) => selectedPathIds.value.includes(id)),
);
const selectedPath = computed(() => selectedPaths.value[0]);
const selectionBounds = computed(() => {
  if (!selectedPaths.value.length) return null;
  const left = Math.min(...selectedPaths.value.map(({ bounds }) => bounds.x));
  const top = Math.min(...selectedPaths.value.map(({ bounds }) => bounds.y));
  const right = Math.max(
    ...selectedPaths.value.map(({ bounds }) => bounds.x + bounds.width),
  );
  const bottom = Math.max(
    ...selectedPaths.value.map(({ bounds }) => bounds.y + bounds.height),
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
});
const selectionActionsStyle = computed(() => {
  const bounds = selectionBounds.value;
  if (!bounds) return {};
  return {
    left: `${(bounds.x + bounds.width - camera.x) * camera.zoom + 6}px`,
    top: `${(bounds.y - camera.y) * camera.zoom}px`,
  };
});

const canUndo = ref(false);
const canRedo = ref(false);
const usePenPressure = ref(false);

const { theme } = useTheme();

const MAX_ZOOM = 2;
const MIN_ZOOM = 0.5;
const LAYER_COUNT = 3;

interface Pointer {
  id: number;
  lastX: number;
  lastY: number;
  lastWorldPosition: Point | null;
  mode: "draw" | "pan" | "move" | "marquee";
  inputMode: InputMode;
  color: string;
  moveOffset: Point;
  marqueeEnd: Point | null;
}

const canvasStyle = computed(() => {
  switch (pointer.active?.mode) {
    case "pan":
    case "move":
      return {
        cursor: "grabbing",
      };
    default:
      return {
        cursor:
          (pointer.active?.inputMode ?? inputMode.value) === "select"
            ? "default"
            : "none",
      };
  }
});

const renderer = createCanvasRenderer(() => ({
  canvas: guestbookCanvas.value,
  context: ctx.value,
  camera,
  layerCount: LAYER_COUNT,
  activeLayer: activeLayer.value,
  paths: committedPaths.value,
  selectedPaths: selectedPaths.value,
  selectionBounds: selectionBounds.value,
  inputMode: inputMode.value,
  activePointer: pointer.active,
  brushPosition: pointer.position && getWorldPosition(pointer.position),
  brushSize: brushSize.value,
  pathDraft,
}));
const scheduleDrawBoard = renderer.schedule;

onMounted(() => {
  const canvas = guestbookCanvas.value;
  if (canvas) {
    camera.x = -canvas.clientWidth / (2 * camera.zoom);
    camera.y = -canvas.clientHeight / (2 * camera.zoom);
    drawing = new FlashishDrawing();
    const context = canvas.getContext("2d");
    ctx.value = context;
    initializeCanvasColors();
    nextTick(() => {
      brushColor.value = theme.value ? "#000000" : "#ffffff";
    });
    const handleResize = () => {
      canvasSize.width = canvas.clientWidth;
      canvasSize.height = canvas.clientHeight;
      scheduleDrawBoard();
    };
    handleResize();
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    window.addEventListener("keydown", handleKeys);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", handleKeys);
  renderer.dispose();
});

watch([theme], () => {
  initializeCanvasColors(true);
  renderer.invalidateBackdrop();
  scheduleDrawBoard();
});

watch(brushSize, scheduleDrawBoard);

function handlePointerDown(event: PointerEvent) {
  if (pointer.active !== null) return;
  const isEraser = event.pointerType === "pen" && event.button === 5;
  if (
    !isEraser &&
    event.button !== 0 &&
    event.button !== 1 &&
    event.button !== 2
  )
    return;
  const canvas = guestbookCanvas.value;
  if (!canvas) return;

  const isDrawing = event.button === 0 || isEraser;
  const activeInputMode = isEraser ? "erase" : inputMode.value;
  const position = isDrawing ? getWorldPosition(event) : null;
  if (isDrawing && !position) return;
  if (isDrawing && activeInputMode !== "select" && selectedPathIds.value.length)
    clearSelection();

  const hit =
    position && activeInputMode === "select" ? findPathAt(position) : null;
  if (position && activeInputMode === "select" && hit !== null) {
    if (!selectedPathIds.value.includes(hit)) {
      clearSelection();
      const nextHit = findPathAt(position);
      setSelection(nextHit === null ? [] : [nextHit]);
    }
    if (selectedPaths.value.length === 1 && selectedPath.value)
      activeLayer.value = selectedPath.value.layer;
  }
  pointer.active = {
    id: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    lastWorldPosition: position,
    mode: !isDrawing
      ? "pan"
      : activeInputMode === "select"
        ? hit === null
          ? "marquee"
          : "move"
        : "draw",
    inputMode: activeInputMode,
    color: brushColor.value,
    moveOffset: { x: 0, y: 0 },
    marqueeEnd: position,
  };
  heldButton = isEraser
    ? 32
    : event.button === 0
      ? 1
      : event.button === 1
        ? 4
        : 2;
  canvas.setPointerCapture(event.pointerId);
  updateBrushCursor(event);
  if (position && pointer.active.mode === "draw") {
    const path = new Path2D();
    path.moveTo(position.x, position.y);
    path.lineTo(position.x, position.y);
    pathDraft = [
      { path, from: position, to: position, size: getSegmentSize(event) },
    ];
  }
  scheduleDrawBoard();
}

function handlePointerMove(event: PointerEvent) {
  if (pointer.active === null || pointer.active.id === event.pointerId) {
    updateBrushCursor(event);
  }
  if (pointer.active?.id !== event.pointerId) return;
  if (!(event.buttons & heldButton)) {
    endPointer(event);
    return;
  }
  updatePointer(event);
}

function updatePointer(event: PointerEvent) {
  if (pointer.active?.mode === "draw") {
    const position = getWorldPosition(event);
    const previousPosition = pointer.active.lastWorldPosition;
    if (position && previousPosition) {
      const path = new Path2D();
      path.moveTo(previousPosition.x, previousPosition.y);
      path.lineTo(position.x, position.y);
      pathDraft.push({
        path,
        from: previousPosition,
        to: position,
        size: getSegmentSize(event),
      });
      pointer.active.lastWorldPosition = position;
    }
  } else if (pointer.active?.mode === "move") {
    const position = getWorldPosition(event);
    const start = pointer.active.lastWorldPosition;
    if (position && start && selectedPathIds.value.length) {
      pointer.active.moveOffset = {
        x: position.x - start.x,
        y: position.y - start.y,
      };
    }
  } else if (pointer.active?.mode === "marquee") {
    pointer.active.marqueeEnd = getWorldPosition(event);
  } else if (pointer.active?.mode === "pan") {
    const dx = event.clientX - pointer.active.lastX;
    const dy = event.clientY - pointer.active.lastY;
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;
    pointer.active.lastX = event.clientX;
    pointer.active.lastY = event.clientY;
  }
  scheduleDrawBoard();
}

function findPathAt(position: Point) {
  const context = ctx.value;
  if (!context) return null;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  const hit = committedPaths.value
    .slice()
    .reverse()
    .find(({ path }) => context.isPointInPath(path, position.x, position.y));
  context.restore();
  return hit?.id ?? null;
}

function getSegmentSize(event: PointerEvent) {
  if (event.type === "pointerup") {
    return pathDraft.at(-1)?.size ?? brushSize.value;
  }
  return event.pointerType === "pen" &&
    (event.buttons & 33) !== 0 &&
    usePenPressure.value
    ? brushSize.value * Math.max(event.pressure, 0.01)
    : brushSize.value;
}

function updateBrushCursor(event: PointerEvent) {
  const canvas = guestbookCanvas.value;
  if (
    !canvas ||
    (pointer.active !== null && pointer.active.id !== event.pointerId)
  )
    return;
  if (event.pointerType === "touch") {
    pointer.position = null;
    scheduleDrawBoard();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  pointer.position =
    event.clientX >= rect.left &&
    event.clientX < rect.right &&
    event.clientY >= rect.top &&
    event.clientY < rect.bottom
      ? { clientX: event.clientX, clientY: event.clientY }
      : null;
  scheduleDrawBoard();
}

function hideBrushCursor(event: PointerEvent) {
  if (pointer.active !== null && pointer.active.id !== event.pointerId) return;
  pointer.position = null;
  scheduleDrawBoard();
}

function getWorldPosition(event: { clientX: number; clientY: number }) {
  const canvas = guestbookCanvas.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x:
      camera.x +
      ((event.clientX - rect.left) * canvas.clientWidth) /
        rect.width /
        camera.zoom,
    y:
      camera.y +
      ((event.clientY - rect.top) * canvas.clientHeight) /
        rect.height /
        camera.zoom,
  };
}

function handleWheel(event: WheelEvent) {
  const canvas = guestbookCanvas.value;
  if (
    !canvas ||
    !((event.button === 0 && event.ctrlKey) || (event.buttons & 4) !== 0)
  )
    return;

  event.preventDefault();

  zoom(event.deltaY, { x: event.clientX, y: event.clientY });
}

function zoom(delta: number, center?: { x: number; y: number }) {
  const canvas = guestbookCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = center
    ? ((center.x - rect.left) * canvas.clientWidth) / rect.width
    : canvas.clientWidth / 2;
  const y = center
    ? ((center.y - rect.top) * canvas.clientHeight) / rect.height
    : canvas.clientHeight / 2;
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

function endPointer(event: PointerEvent) {
  if (pointer.active?.id === event.pointerId) {
    const active = pointer.active;
    pointer.active = null;
    if (event.type === "pointercancel" || event.pointerType === "touch") {
      pointer.position = null;
    }
    const canvas = guestbookCanvas.value;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (pathDraft.length) {
      drawing.addStroke(
        pathDraft,
        active.inputMode === "draw" ? active.color : null,
        activeLayer.value,
      );
      syncDrawing();
    } else if (
      active.mode === "move" &&
      selectedPathIds.value.length &&
      event.type !== "pointercancel" &&
      event.type !== "lostpointercapture"
    ) {
      selectedPathIds.value = drawing.movePaths(
        selectedPathIds.value,
        active.moveOffset.x,
        active.moveOffset.y,
      );
      syncDrawing();
    } else if (
      active.mode === "marquee" &&
      active.lastWorldPosition &&
      active.marqueeEnd &&
      event.type !== "pointercancel" &&
      event.type !== "lostpointercapture"
    ) {
      clearSelection();
      setSelection(
        active.lastWorldPosition.x === active.marqueeEnd.x ||
        active.lastWorldPosition.y === active.marqueeEnd.y
          ? []
          : drawing.pathsInRectangle(
              active.lastWorldPosition,
              active.marqueeEnd,
            ),
      );
    }
    pathDraft = [];
    scheduleDrawBoard();
  }
}

function syncDrawing() {
  committedPaths.value = drawing.paths.map(
    ({ id, color, layer, pathData, bounds }) => ({
      id,
      color,
      layer,
      path: new Path2D(pathData),
      bounds,
    }),
  );
  selectedPathIds.value = selectedPathIds.value.filter((id) =>
    committedPaths.value.some((path) => path.id === id),
  );
  if (selectedPaths.value.length === 1 && selectedPath.value) {
    activeLayer.value = selectedPath.value.layer;
  }
  canUndo.value = drawing.canUndo;
  canRedo.value = drawing.canRedo;
  scheduleDrawBoard();
}

function setSelection(ids: number[]) {
  selectedPathIds.value = ids;
  const selected = new Set(ids);
  selectionOrigins = new Map(
    drawing.paths
      .filter(({ id }) => selected.has(id))
      .map(({ id, bounds }) => [id, { x: bounds.x, y: bounds.y }]),
  );
}

function clearSelection() {
  const selected = new Set(selectedPathIds.value);
  const moved = drawing.paths
    .filter(({ id, bounds }) => {
      const origin = selectionOrigins.get(id);
      return (
        selected.has(id) &&
        origin &&
        (bounds.x !== origin.x || bounds.y !== origin.y)
      );
    })
    .map(({ id }) => id);
  selectedPathIds.value = [];
  selectionOrigins.clear();
  if (moved.length) {
    drawing.mergeMovedPaths(moved);
    syncDrawing();
  }
}

function setInputMode(mode: InputMode) {
  if (inputMode.value === "select" && mode !== "select") clearSelection();
  inputMode.value = mode;
  scheduleDrawBoard();
}

function selectLayer(layer: number) {
  clearSelection();
  activeLayer.value = layer;
  scheduleDrawBoard();
}

function moveSelectionLayer(direction: -1 | 1) {
  if (!selectedPathIds.value.length || pointer.active) return;
  selectedPathIds.value = drawing.movePathsByLayer(
    selectedPathIds.value,
    direction,
  );
  syncDrawing();
}

function setSelectionColor(color: string) {
  if (!selectedPathIds.value.length || pointer.active) return;
  selectedPathIds.value = drawing.setPathsColor(
    selectedPathIds.value,
    color,
    selectionColorChange?.token,
  );
  syncDrawing();
}

function beginSelectionColorChange(kind: string) {
  if (selectionColorChange?.kind !== kind || kind !== "keyboard") {
    selectionColorChange = { kind, token: {} };
  }
}

function endSelectionColorChange(kind: string) {
  if (selectionColorChange?.kind === kind) selectionColorChange = null;
}

function undo() {
  if (pointer.active || !drawing.canUndo) return;
  drawing.undo();
  syncDrawing();
}

function redo() {
  if (pointer.active || !drawing.canRedo) return;
  drawing.redo();
  syncDrawing();
}

function handleKeys(event: KeyboardEvent) {
  const target = event.target;
  if (
    event.defaultPrevented ||
    (target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)))
  )
    return;

  if (event.ctrlKey || event.metaKey) {
    if (event.code === "KeyZ" || event.code === "KeyY") {
      event.preventDefault();
      if (event.code === "KeyY" || event.shiftKey) redo();
      else undo();
    }
    return;
  }
  if (event.altKey || pointer.active) return;
  if (
    inputMode.value === "select" &&
    selectedPathIds.value.length > 0 &&
    (event.key === "Delete" || event.key === "Backspace")
  ) {
    event.preventDefault();
    deleteSelection();
  }
  if (event.code === "KeyB" || event.code === "Digit1")
    setInputMode("draw");
  if (event.code === "KeyV" || event.code === "Digit2")
    setInputMode("select");
  if (event.code === "KeyE" || event.code === "Digit3")
    setInputMode("erase");
}

function handlePointerUp(event: PointerEvent) {
  if (pointer.active?.id === event.pointerId) {
    updatePointer(event);
    updateBrushCursor(event);
    endPointer(event);
  }
}
function deleteSelection() {
  if (!selectedPathIds.value.length || pointer.active) return;
  drawing.deletePaths(selectedPathIds.value);
  selectedPathIds.value = [];
  selectionOrigins.clear();
  syncDrawing();
}
</script>
