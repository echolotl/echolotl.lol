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
      v-if="inputMode === 'select' && selectedPath && !interactionActive"
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
          v-if="inputMode === 'draw' || inputMode === 'erase'"
          class="vertical-actions input-modes"
          role="group"
          aria-label="Drawing layer"
        >
          <button
            type="button"
            class="round"
            aria-label="Use Pen Pressure"
            :disabled="interactionActive"
            :class="{ active: usePenPressure }"
            @click="usePenPressure = !usePenPressure"
          >
            <Icon icon="pen-pressure" size="20px" />
          </button>
        </div>
        <div
          class="vertical-actions input-modes"
          role="group"
          aria-label="Flip Camera"
        >
          <button
            type="button"
            class="round"
            aria-label="Flip Horizontally"
            :aria-pressed="camera.flipX"
            :class="{ active: camera.flipX }"
            :disabled="interactionActive"
            @click="flipCamera('horizontal')"
          >
            <Icon icon="flip-h" size="20px" />
          </button>
          <button
            type="button"
            class="round"
            aria-label="Flip Vertically"
            :aria-pressed="camera.flipY"
            :class="{ active: camera.flipY }"
            :disabled="interactionActive"
            @click="flipCamera('vertical')"
          >
            <Icon icon="flip-v" size="20px" />
          </button>
        </div>
        <div
          v-if="inputMode !== 'pan'"
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
            :disabled="interactionActive"
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
          <div v-if="inputMode === 'draw' || inputMode === 'erase'">
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
                :disabled="interactionActive"
              />
            </div>
            <label for="brush-stabilization">Stabilization</label>
            <div class="property">
              <output
                for="brush-stabilization"
                class="lotl-font stabilization-value"
                >{{ stabilization }}%</output
              >
              <input
                id="brush-stabilization"
                v-model.number="stabilization"
                type="range"
                :min="MIN_STABILIZATION"
                :max="MAX_STABILIZATION"
                step="5"
                :disabled="interactionActive"
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
            v-for="(definition, mode) in CANVAS_INPUT_MODES"
            :key="mode"
            type="button"
            class="round"
            :class="{ active: inputMode === mode }"
            :aria-label="`${mode.charAt(0).toUpperCase()}${mode.slice(1)} mode`"
            :aria-pressed="inputMode === mode"
            :disabled="interactionActive"
            @click="setInputMode(mode)"
          >
            <Icon :icon="definition.icon" size="20px" />
          </button>
        </div>
        <div class="input-modes">
          <button
            type="button"
            class="round"
            aria-label="Undo"
            :disabled="!canUndo || interactionActive"
            @click="undo"
          >
            <Icon icon="undo" size="20px" />
          </button>
          <button
            type="button"
            class="round"
            aria-label="Redo"
            :disabled="!canRedo || interactionActive"
            @click="redo"
          >
            <Icon icon="redo" size="20px" />
          </button>
        </div>
        <div class="input-modes" role="group" aria-label="Zoom">
          <button
            type="button"
            :disabled="interactionActive || camera.zoom === MAX_ZOOM"
            aria-label="Zoom in"
            @click="zoomFromWheel(-200)"
          >
            <Icon icon="zoom-in" size="20px" />
          </button>
          <button
            type="button"
            :disabled="interactionActive || camera.zoom === MIN_ZOOM"
            aria-label="Zoom out"
            @click="zoomFromWheel(200)"
          >
            <Icon icon="zoom-out" size="20px" />
          </button>
          <button
            class="zoom-level lotl-font"
            :disabled="interactionActive || camera.zoom === 1"
            aria-label="Reset zoom"
            @click="zoom(1 - camera.zoom)"
          >
            {{ (camera.zoom * 100).toFixed(0) }}%
          </button>
        </div>
        <div class="input-modes" role="group" aria-label="Canvas rotation">
          <button
            type="button"
            :disabled="interactionActive"
            aria-label="Rotate canvas counterclockwise"
            @click="rotateCamera(-Math.PI / 12)"
          >
            <Icon icon="rotate-ccw" size="20px" />
          </button>
          <button
            type="button"
            :disabled="interactionActive"
            aria-label="Rotate canvas clockwise"
            @click="rotateCamera(Math.PI / 12)"
          >
            <Icon icon="rotate-cw" size="20px" />
          </button>
          <button
            type="button"
            class="zoom-level lotl-font"
            :disabled="interactionActive || camera.rotation === 0"
            aria-label="Reset canvas rotation"
            @click="rotateCamera(-camera.rotation)"
          >
            {{ Math.round((camera.rotation * 180) / Math.PI) }}°
          </button>
        </div>
        <div class="input-modes" role="group" aria-label="Color picking">
          <button
            type="button"
            class="round"
            :class="{ active: eyedropperActive }"
            aria-label="Pick color from canvas"
            :aria-pressed="eyedropperActive"
            :disabled="interactionActive"
            @click="eyedropperActive = !eyedropperActive"
          >
            <Icon icon="eyedropper" size="20px" />
          </button>
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
      output.stabilization-value {
        width: 4ch;
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
  getCanvasInputModeForKey,
  type Camera,
  type CanvasInputMode,
  type Point,
  type RenderedPath,
} from "~/utils/canvas";
import {
  measureGesture,
  screenToWorld,
  updateCameraAt,
  worldToScreen,
} from "~/utils/canvas/camera";
import Icon from "~/components/ui/Icon.vue";
import ColorPicker from "~/components/ui/ColorPicker.vue";

/**
 * Reference to the guestbook canvas element.
 */
const guestbookCanvas: Ref<HTMLCanvasElement | null> = ref(null);
/**
 * Reference to the 2D rendering context of the guestbook canvas.
 */
const ctx: Ref<CanvasRenderingContext2D | null> = ref(null);

/**
 * The camera object representing the current view of the canvas.
 */
const camera: Camera = reactive({
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
});

/**
 * The size of the canvas element.
 */
const canvasSize = reactive({ width: 0, height: 0 });

/**
 * The center point of the viewport in world coordinates.
 */
const viewportCenter = computed(() =>
  screenToWorld({ x: canvasSize.width / 2, y: canvasSize.height / 2 }, camera),
);

/**
 * The pointer object representing the current state of the pointer.
 */
const pointer = reactive<{
  position: { clientX: number; clientY: number } | null;
  active: Pointer | null;
}>({ position: null, active: null });

/**
 * The map of active touch points, keyed by their identifier.
 */
const touches = new Map<number, Point>();
/**
 * Indicates whether a touch gesture is currently in progress.
 */
const touchGesture = ref(false);
/**
 * Indicates whether any interaction (pointer or touch gesture) is currently active.
 */
const interactionActive = computed(
  () => !!pointer.active || touchGesture.value,
);
/**
 * The currently held mouse button.
 */
let heldButton = 0;

/**
 * The resize observer for the canvas element.
 */
let resizeObserver: ResizeObserver | undefined;

/**
 * The size of the brush.
 */
const brushSize = ref(DEFAULT_BRUSH_SIZE);
/**
 * The color of the brush.
 */
const brushColor = ref("#ffffff");

/**
 * The current stabilization value for the brush.
 */
const stabilization = ref(DEFAULT_STABILIZATION);

/**
 * The current drawing object.
 */
let drawing: FlashishDrawing;

/**
 * The draft paths that are currently being drawn but not yet committed.
 */
let pathDraft: (BrushSegment & { path: Path2D })[] = [];

/**
 * The committed paths that have been finalized and are part of the drawing.
 */
const committedPaths = shallowRef<RenderedPath[]>([]);

/**
 * The currently active layer in the drawing.
 */
const activeLayer = ref(2);

/**
 * The currently selected input mode for interacting with the canvas.
 */
const inputMode = ref<CanvasInputMode>("draw");

/**
 * Whether the eyedropper tool is currently active.
 */
const eyedropperActive = ref(false);

/**
 * The IDs of the currently selected paths.
 */
const selectedPathIds = ref<number[]>([]);
/**
 * The original positions of the selected paths before any movement.
 */
let selectionOrigins = new Map<number, Point>();
/**
 * The color change associated with the current selection, if any.
 */
let selectionColorChange: { kind: string; token: object } | null = null;

/**
 * The currently selected paths based on the selected path IDs.
 */
const selectedPaths = computed(() =>
  committedPaths.value.filter(({ id }) => selectedPathIds.value.includes(id)),
);

/**
 * The first selected path, if any.
 */
const selectedPath = computed(() => selectedPaths.value[0]);

/**
 * The bounding box of the current selection, if any.
 */
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

/**
 * The style for the selection actions UI based on the current selection bounds.
 */
const selectionActionsStyle = computed(() => {
  const bounds = selectionBounds.value;
  if (!bounds) return {};
  const corners = [
    worldToScreen({ x: bounds.x, y: bounds.y }, camera),
    worldToScreen({ x: bounds.x + bounds.width, y: bounds.y }, camera),
    worldToScreen({ x: bounds.x, y: bounds.y + bounds.height }, camera),
    worldToScreen(
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      camera,
    ),
  ];
  return {
    left: `${Math.max(...corners.map((point) => point.x)) + 6}px`,
    top: `${Math.min(...corners.map((point) => point.y))}px`,
  };
});

/**
 * Whether an undo operation can be performed.
 */
const canUndo = ref(false);
/**
 * Whether a redo operation can be performed.
 */
const canRedo = ref(false);
/**
 * Whether pen pressure is being used for drawing.
 */
const usePenPressure = ref(false);

const { theme } = useTheme();

/**
 * Represents a pointer's state during interaction with the canvas.
 */
interface Pointer {
  id: number;
  lastX: number;
  lastY: number;
  lastWorldPosition: Point | null;
  mode: "draw" | "pan" | "move" | "marquee";
  inputMode: CanvasInputMode;
  color: string;
  moveOffset: Point;
  marqueeEnd: Point | null;
}

/**
 * The style for the canvas element based on the current pointer state.
 * @returns An object containing CSS properties for the canvas element.
 */
const canvasStyle = computed(() => {
  switch (pointer.active?.mode) {
    case "pan":
    case "move":
      return {
        cursor: "grabbing",
      };
    default:
      return {
        cursor: eyedropperActive.value
          ? "crosshair"
          : (pointer.active?.inputMode ?? inputMode.value) === "select"
            ? "default"
            : (pointer.active?.inputMode ?? inputMode.value) === "pan"
              ? "grab"
              : "none",
      };
  }
});

/**
 * The renderer responsible for drawing the canvas content.
 */
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
  eyedropperActive: eyedropperActive.value,
  activePointer: pointer.active,
  brushPosition: pointer.position && getWorldPosition(pointer.position),
  brushSize: brushSize.value,
  pathDraft,
}));

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
      renderer.schedule();
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
  renderer.schedule();
});

watch(brushSize, () => renderer.schedule());
watch(eyedropperActive, () => renderer.schedule());

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === "touch") {
    if (pointer.active && !touches.has(pointer.active.id)) return;
    const canvas = guestbookCanvas.value;
    if (!canvas) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (touches.size >= 2) {
      touchGesture.value = true;
      pointer.active = null;
      pointer.position = null;
      pathDraft = [];
      renderer.schedule();
      return;
    }
    if (touchGesture.value) return;
  } else if (touchGesture.value) {
    return;
  }
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

  const activeInputMode = isEraser ? "erase" : inputMode.value;
  const pointerInputMode =
    event.button === 0 || isEraser ? activeInputMode : "pan";
  const isDrawing = pointerInputMode !== "pan";
  const position =
    isDrawing || (eyedropperActive.value && event.button === 0)
      ? getWorldPosition(event)
      : null;
  if (isDrawing && !position) return;
  if (eyedropperActive.value && event.button === 0 && position) {
    const path = findPathAt(position);
    if (path) {
      brushColor.value =
        path.color === "primary"
          ? initializeCanvasColors().primary
          : path.color;
      eyedropperActive.value = false;
    }
    return;
  }
  let mode: Pointer["mode"];
  switch (pointerInputMode) {
    case "draw":
    case "erase":
      if (selectedPathIds.value.length) clearSelection();
      mode = "draw";
      break;
    case "select": {
      const hit = position ? (findPathAt(position)?.id ?? null) : null;
      if (position && hit !== null) {
        if (!selectedPathIds.value.includes(hit)) {
          clearSelection();
          const nextHit = findPathAt(position);
          setSelection(nextHit === null ? [] : [nextHit.id]);
        }
        if (selectedPaths.value.length === 1 && selectedPath.value)
          activeLayer.value = selectedPath.value.layer;
      }
      mode = hit === null ? "marquee" : "move";
      break;
    }
    case "pan":
      mode = "pan";
      break;
  }
  pointer.active = {
    id: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    lastWorldPosition: position,
    mode,
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
  renderer.schedule();
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === "touch" && touches.has(event.pointerId)) {
    const previous = Array.from(touches.values());
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchGesture.value) {
      const current = Array.from(touches.values());
      if (previous.length >= 2 && current.length >= 2) {
        const previousA = getCameraAnchor(previous[0]);
        const previousB = getCameraAnchor(previous[1]);
        const currentA = getCameraAnchor(current[0]);
        const currentB = getCameraAnchor(current[1]);
        if (previousA && previousB && currentA && currentB) {
          const change = measureGesture(
            [previousA, previousB],
            [currentA, currentB],
          );
          const center = {
            x: (current[0]!.x + current[1]!.x) / 2,
            y: (current[0]!.y + current[1]!.y) / 2,
          };
          panCamera(-change.pan.x, -change.pan.y);
          zoom(camera.zoom * (change.scale - 1), center);
          rotateCamera(change.rotation, center);
        }
      }
      return;
    }
  }
  if (touchGesture.value) return;
  if (pointer.active === null || pointer.active.id === event.pointerId) {
    updateBrushCursor(event);
  }
  if (pointer.active?.id !== event.pointerId) return;
  if (!(event.buttons & heldButton)) {
    endPointer(event);
    return;
  }
  const coalescedEvents = event.getCoalescedEvents?.();
  for (const sample of coalescedEvents?.length ? coalescedEvents : [event]) {
    updatePointer(sample);
  }
}

/**
 * When a pointer event occurs, update the pointer state accordingly.
 * @param event The pointer event to handle.
 */
function updatePointer(event: PointerEvent) {
  if (pointer.active?.mode === "draw") {
    const rawPosition = getWorldPosition(event);
    const previousPosition = pointer.active.lastWorldPosition;
    if (rawPosition && previousPosition) {
      const amount =
        (stabilization.value - MIN_STABILIZATION) /
        (MAX_STABILIZATION - MIN_STABILIZATION);
      const smoothing = event.type === "pointerup" ? 0 : amount * 0.9;
      const position = {
        x:
          previousPosition.x +
          (rawPosition.x - previousPosition.x) * (1 - smoothing),
        y:
          previousPosition.y +
          (rawPosition.y - previousPosition.y) * (1 - smoothing),
      };
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
    panCamera(-dx, -dy);
    pointer.active.lastX = event.clientX;
    pointer.active.lastY = event.clientY;
  }
  renderer.schedule();
}

/**
 * Finds the path at the given world position.
 * @param position The world position to check for a path.
 * @returns The rendered path at the given position, or null if none is found.
 */
function findPathAt(position: Point): RenderedPath | null {
  const context = ctx.value;
  if (!context) return null;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  let hit: RenderedPath | undefined;
  for (let layer = LAYER_COUNT; layer >= 1 && !hit; layer--) {
    hit = committedPaths.value
      .slice()
      .reverse()
      .find(
        (path) =>
          path.layer === layer &&
          context.isPointInPath(path.path, position.x, position.y),
      );
  }
  context.restore();
  return hit ?? null;
}

/**
 * Gets the width of the current segment based on the pointer event.
 * @param event The pointer event to determine the segment width from.
 * @returns The width of the segment.
 */
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

/**
 * Updates the brush cursor position based on the pointer event.
 * @param event The pointer event to update the brush cursor from.
 */
function updateBrushCursor(event: PointerEvent) {
  const canvas = guestbookCanvas.value;
  if (
    !canvas ||
    (pointer.active !== null && pointer.active.id !== event.pointerId)
  )
    return;
  if (event.pointerType === "touch" || inputMode.value === "pan") {
    pointer.position = null;
    renderer.schedule();
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
  renderer.schedule();
}

function hideBrushCursor(event: PointerEvent) {
  if (pointer.active !== null && pointer.active.id !== event.pointerId) return;
  pointer.position = null;
  renderer.schedule();
}

/**
 * Gets the world position of the pointer event relative to the canvas.
 * @param event The pointer event to get the world position from.
 * @returns The world position, or null if the canvas is not available.
 */
function getWorldPosition(event: { clientX: number; clientY: number }) {
  const canvas = guestbookCanvas.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return screenToWorld(
    {
      x: ((event.clientX - rect.left) * canvas.clientWidth) / rect.width,
      y: ((event.clientY - rect.top) * canvas.clientHeight) / rect.height,
    },
    camera,
  );
}

/**
 * Pans the camera by the given delta values.
 * @param dx The change in the x-coordinate.
 * @param dy The change in the y-coordinate.
 */
function panCamera(dx: number, dy: number) {
  const position = screenToWorld({ x: dx, y: dy }, camera);
  camera.x = position.x;
  camera.y = position.y;
}

function handleWheel(event: WheelEvent) {
  const canvas = guestbookCanvas.value;
  if (!canvas) return;

  const zoomWithWheel =
    (event.button === 0 && event.ctrlKey) || (event.buttons & 4) !== 0;
  if (!zoomWithWheel && inputMode.value !== "pan") return;

  event.preventDefault();
  if (zoomWithWheel) {
    zoomFromWheel(event.deltaY, { x: event.clientX, y: event.clientY });
  } else {
    panCamera(event.deltaX, event.deltaY);
    renderer.schedule();
  }
}

function getCameraAnchor(center?: Point): Point | null {
  const canvas = guestbookCanvas.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = center
    ? ((center.x - rect.left) * canvas.clientWidth) / rect.width
    : canvas.clientWidth / 2;
  const y = center
    ? ((center.y - rect.top) * canvas.clientHeight) / rect.height
    : canvas.clientHeight / 2;
  return { x, y };
}

function zoomFromWheel(delta: number, center?: Point) {
  let target = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, camera.zoom * Math.exp(-delta * 0.001)),
  );
  if ((camera.zoom < 1 && target >= 1) || (camera.zoom > 1 && target <= 1)) {
    target = 1;
  }
  zoom(target - camera.zoom, center);
}

function zoom(amount: number, center?: Point) {
  const anchor = getCameraAnchor(center);
  if (!anchor) return;
  const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom + amount));
  updateCameraAt(camera, anchor, { zoom: target });
  renderer.schedule();
}

function rotateCamera(amount: number, center?: Point) {
  const anchor = getCameraAnchor(center);
  if (!anchor) return;
  let rotation = camera.rotation + amount;
  if (rotation >= Math.PI || rotation < -Math.PI) {
    rotation =
      ((((rotation + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
      Math.PI;
  }
  updateCameraAt(camera, anchor, { rotation });
  renderer.schedule();
}

function flipCamera(axis: "horizontal" | "vertical") {
  const anchor = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  updateCameraAt(
    camera,
    anchor,
    axis === "horizontal" ? { flipX: !camera.flipX } : { flipY: !camera.flipY },
  );
  renderer.schedule();
}

function endPointer(event: PointerEvent) {
  if (event.pointerType === "touch" && touches.delete(event.pointerId)) {
    if (touchGesture.value) {
      if (touches.size === 0) touchGesture.value = false;
      const canvas = guestbookCanvas.value;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (pointer.active?.id !== event.pointerId) {
      const canvas = guestbookCanvas.value;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      return;
    }
  }
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
    renderer.schedule();
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
  renderer.schedule();
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

function setInputMode(mode: CanvasInputMode) {
  eyedropperActive.value = false;
  if (inputMode.value === "select" && mode !== "select") clearSelection();
  inputMode.value = mode;
  renderer.schedule();
}

function selectLayer(layer: number) {
  clearSelection();
  activeLayer.value = layer;
  renderer.schedule();
}

function moveSelectionLayer(direction: -1 | 1) {
  if (!selectedPathIds.value.length || interactionActive.value) return;
  selectedPathIds.value = drawing.movePathsByLayer(
    selectedPathIds.value,
    direction,
  );
  syncDrawing();
}

function setSelectionColor(color: string) {
  if (!selectedPathIds.value.length || interactionActive.value) return;
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
  if (interactionActive.value || !drawing.canUndo) return;
  drawing.undo();
  syncDrawing();
}

function redo() {
  if (interactionActive.value || !drawing.canRedo) return;
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
  if (event.altKey || interactionActive.value) return;
  if (
    inputMode.value === "select" &&
    selectedPathIds.value.length > 0 &&
    (event.key === "Delete" || event.key === "Backspace")
  ) {
    event.preventDefault();
    deleteSelection();
  }
  if (event.code === "KeyI") eyedropperActive.value = true;
  const mode = getCanvasInputModeForKey(event.code);
  if (mode) setInputMode(mode);
}

function handlePointerUp(event: PointerEvent) {
  if (pointer.active?.id === event.pointerId) {
    updatePointer(event);
    updateBrushCursor(event);
  }
  endPointer(event);
}
function deleteSelection() {
  if (!selectedPathIds.value.length || interactionActive.value) return;
  drawing.deletePaths(selectedPathIds.value);
  selectedPathIds.value = [];
  selectionOrigins.clear();
  syncDrawing();
}
</script>
