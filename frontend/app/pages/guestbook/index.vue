<template>
  <div class="guestbook-container">
    <div class="guestbook-notices">
      <div v-if="status === 'loading' || connecting" class="guestbook-status">
        <Icon icon="loading" size="20px" /> Connecting...
      </div>
      <div v-if="toastMessage" class="guestbook-status" role="alert">
        <Icon
          :icon="toastMessage?.type === 'error' ? 'error' : 'info'"
          size="20px"
        />
        {{ toastMessage?.message }}
      </div>
      <div v-if="!isLoggedIn" class="guestbook-status">
        <Icon icon="view" size="20px" />
        <span
          ><button class="link" @click="login">Login</button> to draw or
          edit.</span
        >
      </div>
    </div>
    <canvas
      ref="guestbookCanvas"
      :style="canvasStyle"
      aria-label="Guestbook drawing canvas"
      @mousedown.middle.prevent
      @pointerenter="handlePointerEnter"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="hideBrushCursor"
      @pointercancel="endPointer"
      @lostpointercapture="endPointer"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent
      @wheel="handleWheel"
    ></canvas>
    <div
      v-if="
        isLoggedIn &&
        inputMode === 'select' &&
        selectedPath &&
        !interactionActive
      "
      class="selection-actions input-modes"
      :style="selectionActionsStyle"
    >
      <button
        v-if="selectedPaths.some((path) => path.ownerId === null)"
        type="button"
        aria-label="Lock unowned paths in selection"
        @click="setSelectionLocked(true)"
      >
        <Icon icon="lock" size="20px" />
      </button>
      <button
        v-if="selectedPaths.some((path) => path.ownerId === user?.userId)"
        type="button"
        aria-label="Unlock your paths in selection"
        @click="setSelectionLocked(false)"
      >
        <Icon icon="unlock" size="20px" />
      </button>
      <button
        v-if="showGroupAction"
        type="button"
        :aria-label="
          isGroupedSelection ? 'Ungroup selection' : 'Group selection'
        "
        :aria-pressed="isGroupedSelection"
        :disabled="!canEditSelection || !canToggleGrouping"
        @click="toggleSelectionGrouping"
      >
        <Icon :icon="isGroupedSelection ? 'separate' : 'merge'" size="20px" />
      </button>
      <button
        type="button"
        aria-label="Move selection up a layer"
        :disabled="
          !canEditSelection ||
          selectedPaths.some((path) => path.layer === LAYER_COUNT)
        "
        @click="moveSelectionLayer(1)"
      >
        <Icon icon="layer-up" size="20px" />
      </button>
      <button
        type="button"
        aria-label="Move selection down a layer"
        :disabled="
          !canEditSelection || selectedPaths.some((path) => path.layer === 1)
        "
        @click="moveSelectionLayer(-1)"
      >
        <Icon icon="layer-down" size="20px" />
      </button>
      <button
        type="button"
        aria-label="Delete selection"
        :disabled="!canEditSelection"
        @click="deleteSelection"
      >
        <Icon icon="trash" size="20px" />
      </button>
    </div>
    <div v-if="isLoggedIn" class="side-panels">
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
          <div v-if="inputMode === 'draw' || inputMode === 'fill'">
            <label for="brush-color">Color</label>
            <div style="display: flex; justify-content: center">
              <ColorPicker id="brush-color" v-model="brushColor" horizontal />
            </div>
          </div>
          <div
            v-else-if="
              inputMode === 'select' && selectedPath && canEditSelection
            "
          >
            <label for="selection-color">Selection color</label>
            <div style="display: flex; justify-content: center">
              <ColorPicker
                id="selection-color"
                :model-value="selectionColorPreview ?? selectedPath.color"
                horizontal
                @update:model-value="setSelectionColor"
                @interaction-start="beginSelectionColorChange"
                @interaction-end="endSelectionColorChange"
              />
            </div>
          </div>
          <div v-else-if="inputMode === 'select' && selectedPath">
            <p>This selection contains paths owned by another user.</p>
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
        <div v-if="isLoggedIn" class="input-modes">
          <button
            v-for="(definition, mode) in GUESTBOOK_INPUT_MODES"
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
        <div v-if="isLoggedIn" class="input-modes">
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
        <div
          v-if="isLoggedIn"
          class="input-modes"
          role="group"
          aria-label="Color picking"
        >
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

  .guestbook-notices {
    position: absolute;
    top: 64px;
    left: 8px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .guestbook-status {
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
    pointer-events: none;
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
    pointer-events: none;
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
    pointer-events: auto;
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
    pointer-events: auto;

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
  pointer-events: none;
}
</style>

<script setup lang="ts">
import { initializeCanvasColors } from "~/utils/constants";
import type {
  BrushSegment,
  FlashishDrawing as FlashishDrawingType,
} from "@echolotl/flashish";
import type { GuestbookServerMessage, Point } from "@echolotl/types";
import { type Camera } from "~/utils/canvas";
import {
  getGuestbookInputModeForKey,
  type GuestbookInputMode,
  type OtherCursor,
  type OtherStroke,
  type PendingMove,
  type RenderedPath,
  type SelectionPreview,
} from "~/utils/guestbook";
import {
  measureGesture,
  screenToWorld,
  worldToScreen,
} from "~/utils/canvas/camera";
import { GuestbookCamera } from "~/utils/guestbook/camera";
import { GuestbookSocket } from "~/utils/guestbook/socket";
import { GuestbookSelection } from "~/utils/guestbook/selection";
import { GuestbookRenderer } from "~/utils/guestbook/renderer";
import Icon from "~/components/ui/Icon.vue";
import ColorPicker from "~/components/ui/ColorPicker.vue";

//#region STATE
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
let drawing: FlashishDrawingType;

/**
 * The draft paths that are currently being drawn but not yet committed.
 */
let pathDraft: (BrushSegment & { path: Path2D })[] = [];
let activeStroke: {
  strokeId: string;
  color: string | null;
  layer: number;
} | null = null;

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
const inputMode = ref<GuestbookInputMode>("draw");

/**
 * Whether the eyedropper tool is currently active.
 */
const eyedropperActive = ref(false);

/**
 * The IDs of the currently selected paths.
 */
const selectedPathIds = ref<number[]>([]);
const selectionMovement = new Map<number, Point>();
const pendingMoves = reactive(new Map<string, PendingMove>());
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
  const offset = [...pendingMoves.values()].find((move) =>
    move.ids.some((id) => selectedPathIds.value.includes(id)),
  )?.offset;
  const x = bounds.x + (offset?.x ?? 0);
  const y = bounds.y + (offset?.y ?? 0);
  const corners = [
    worldToScreen({ x, y }, camera),
    worldToScreen({ x: x + bounds.width, y }, camera),
    worldToScreen({ x, y: y + bounds.height }, camera),
    worldToScreen({ x: x + bounds.width, y: y + bounds.height }, camera),
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
//#endregion STATE

//#region CLIENT STATE
const { theme } = useTheme();
const { isLoggedIn, user, status, getPublicUser, login } = useAuth();
const { backendUrl, backendEnabled } = useRuntimeConfig().public;
const toastMessage = ref<Toast | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastRequest = 0;
const otherSelections = reactive(new Map<string, SelectionPreview>());
const isSelectedByAnother = (id: number) =>
  [...otherSelections.values()].some((selection) => selection.ids.includes(id));
const canSelectPath = (path: RenderedPath) =>
  (path.ownerId === null || path.ownerId === user.value?.userId) &&
  !isSelectedByAnother(path.id);
const canEditSelection = computed(
  () =>
    selectedPaths.value.length > 0 && selectedPaths.value.every(canSelectPath),
);

const selectionColorPreview = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);

let lastDrawingRevision = -1;
let drawingEpoch: string | null = null;
let selectionSequence = 0;

type Toast = {
  message: string;
  type: "info" | "success" | "error";
  duration?: number;
  closeable?: boolean;
};

/**
 * Represents a pointer's state during interaction with the canvas.
 */
interface Pointer {
  id: number;
  lastX: number;
  lastY: number;
  lastWorldPosition: Point | null;
  mode: "draw" | "pan" | "move" | "marquee" | "fill";
  inputMode: GuestbookInputMode;
  color: string;
  moveOffset: Point;
  marqueeEnd: Point | null;
}

let otherCursors: Record<string, OtherCursor> = {};
let otherStrokes = new Map<string, OtherStroke>();
const pendingStrokes = new Map<string, OtherStroke>();
const pendingFinishingMoves = new Map<string, number[]>();
const connecting = ref(false);

const isGroupedSelection = computed(() => {
  if (!selectedPaths.value.length) return false;
  const groupId = activeGroupId.value ?? selectedPaths.value[0]!.groupId;
  return (
    !!groupId && selectedPaths.value.every((path) => path.groupId === groupId)
  );
});
const showGroupAction = computed(
  () => selectedPaths.value.length > 1 || isGroupedSelection.value,
);
const canToggleGrouping = computed(
  () =>
    (isGroupedSelection.value || selectedPaths.value.length > 1) &&
    !committedPaths.value.some(
      (path) =>
        path.groupId &&
        selectedPaths.value.some(
          (selected) => selected.groupId === path.groupId,
        ) &&
        !canSelectPath(path),
    ),
);

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
      if (!isLoggedIn.value) return { cursor: "grab" };
      return {
        cursor: eyedropperActive.value
          ? "crosshair"
          : (pointer.active?.inputMode ?? inputMode.value) === "fill"
            ? "crosshair"
            : (pointer.active?.inputMode ?? inputMode.value) === "select"
              ? "default"
              : (pointer.active?.inputMode ?? inputMode.value) === "pan"
                ? "grab"
                : "none",
      };
  }
});
//#endregion CLIENT STATE

//#region CLIENT SERVICES
/**
 * The renderer responsible for drawing the canvas content.
 */
const renderer = new GuestbookRenderer(() => ({
  canvas: guestbookCanvas.value,
  context: ctx.value,
  camera,
  layerCount: LAYER_COUNT,
  activeLayer: activeLayer.value,
  paths: committedPaths.value,
  selectedPaths: selectedPaths.value,
  selectionBounds: selectionBounds.value,
  groupSelectionId: activeGroupId.value,
  inputMode: inputMode.value,
  eyedropperActive: eyedropperActive.value,
  activePointer: pointer.active,
  brushPosition:
    isLoggedIn.value && pointer.position
      ? getWorldPosition(pointer.position)
      : null,
  brushSize: brushSize.value,
  pathDraft,
  otherCursors,
  otherStrokes,
  pendingStrokes,
  otherSelections,
  pendingMoves,
  pendingFinishingMoves,
}));

const {
  getWorldPosition,
  panCamera,
  handleWheel,
  getCameraAnchor,
  zoomFromWheel,
  zoom,
  rotateCamera,
  flipCamera,
} = new GuestbookCamera(guestbookCanvas, camera, canvasSize, inputMode, () =>
  renderer.schedule(),
);

const guestbookSocket = new GuestbookSocket({
  backendUrl,
  enabled: backendEnabled,
  onOpen: () => sendSelectionPreview(),
  onMessage: handleWebsocketMessage,
  onClose: () => {
    connecting.value = false;
    otherCursors = {};
    otherStrokes.clear();
    otherSelections.clear();
    pendingFinishingMoves.clear();
    selectedPathIds.value = [];
    activeGroupId.value = null;
    selectionMovement.clear();
    selectionColorPreview.value = null;
    renderer.schedule();
  },
});
const {
  setSelection,
  clearSelection,
  moveSelectionLayer,
  toggleSelectionGrouping,
  setSelectionColor,
  beginSelectionColorChange,
  endSelectionColorChange,
  deleteSelection,
  setSelectionLocked,
} = new GuestbookSelection({
  selectedPathIds,
  selectedPaths,
  committedPaths,
  activeGroupId,
  selectionColorPreview,
  selectionMovement,
  pendingFinishingMoves,
  canSelectPath,
  canEditSelection,
  canToggleGrouping,
  isGroupedSelection,
  interactionActive,
  getUserId: () => user.value?.userId,
  sendEdit: guestbookSocket.sendEdit,
  sendPreview: () => sendSelectionPreview(),
  schedule: () => renderer.schedule(),
});
//#endregion CLIENT SERVICES

//#region VUE LIFECYCLE
onMounted(async () => {
  const canvas = guestbookCanvas.value;
  if (canvas) {
    const { FlashishDrawing } = await import("@echolotl/flashish");
    drawing = new FlashishDrawing();
    watch(
      [isLoggedIn, () => user.value?.userId],
      (_, __, onCleanup) => {
        connecting.value = true;
        const disconnect = guestbookSocket.connect();
        connecting.value = false;
        onCleanup(() => {
          disconnect();
          otherCursors = {};
          otherStrokes.clear();
          otherSelections.clear();
          pendingStrokes.clear();
          pendingMoves.clear();
          pendingFinishingMoves.clear();
          selectedPathIds.value = [];
          activeGroupId.value = null;
          selectionMovement.clear();
          selectionColorPreview.value = null;
          renderer.schedule();
        });
      },
      { immediate: true },
    );
    camera.x = -canvas.clientWidth / (2 * camera.zoom);
    camera.y = -canvas.clientHeight / (2 * camera.zoom);
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
  dismissToast();
  guestbookSocket.close();
  activeStroke = null;
  otherStrokes.clear();
  otherSelections.clear();
  pendingStrokes.clear();
  pendingMoves.clear();
  pendingFinishingMoves.clear();
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
watch(isLoggedIn, () => renderer.schedule());
//#endregion VUE LIFECYCLE

//#region POINTER EVENTS
function handlePointerDown(event: PointerEvent) {
  sendCursorPosition(event);
  if (event.pointerType === "touch") {
    if (pointer.active && !touches.has(pointer.active.id)) return;
    const canvas = guestbookCanvas.value;
    if (!canvas) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (touches.size >= 2) {
      touchGesture.value = true;
      if (activeStroke && guestbookSocket.clientId) {
        guestbookSocket.sendEdit({
          type: "stroke:commit",
          strokeId: activeStroke.strokeId,
          cancelled: true,
        });
      }
      activeStroke = null;
      pointer.active = null;
      pointer.position = null;
      pathDraft = [];
      sendSelectionPreview();
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
  const pointerInputMode = !isLoggedIn.value
    ? "pan"
    : event.button === 0 || isEraser
      ? activeInputMode
      : "pan";
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
    case "fill":
      if (selectedPathIds.value.length) clearSelection();
      mode = "fill";
      break;
    case "select": {
      if (!guestbookSocket.isOpen) {
        showToast({ message: "Connect to select a drawing.", type: "info" });
        return;
      }
      const hitPath = position ? findPathAt(position) : null;
      const hit = hitPath?.id ?? null;
      if (hitPath) {
        if (!canSelectPath(hitPath)) {
          if (isSelectedByAnother(hitPath.id)) {
            showToast({
              message: "This drawing is selected by another user.",
              type: "info",
            });
          } else if (hitPath.ownerId !== null) {
            showOwnershipToast(hitPath.ownerId);
          }
          return;
        }
        const groupId = hitPath.groupId ?? null;
        if (groupId && activeGroupId.value === groupId) {
          const groupPaths = committedPaths.value.filter(
            (path) => path.groupId === groupId && canSelectPath(path),
          );
          const isSingleMemberSelected =
            selectedPathIds.value.length === 1 &&
            selectedPathIds.value[0] === hitPath.id;
          const groupPathIds = new Set(groupPaths.map(({ id }) => id));
          const isWholeGroupSelected =
            selectedPathIds.value.length === groupPaths.length &&
            selectedPathIds.value.every((id) => groupPathIds.has(id));
          if (!isSingleMemberSelected && !isWholeGroupSelected) {
            clearSelection();
            setSelection(
              groupPaths.map(({ id }) => id),
              groupId,
            );
          }
        } else if (groupId) {
          clearSelection();
          const groupPaths = committedPaths.value.filter(
            (path) => path.groupId === groupId && canSelectPath(path),
          );
          setSelection(
            groupPaths.map(({ id }) => id),
            groupId,
          );
        } else if (!selectedPathIds.value.includes(hitPath.id)) {
          clearSelection();
          setSelection([hitPath.id]);
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
    const firstSegment = {
      path,
      from: position,
      to: position,
      size: getSegmentSize(event),
    };
    pathDraft = [firstSegment];
    const color =
      pointer.active.inputMode === "draw" ? pointer.active.color : null;
    activeStroke = {
      strokeId: crypto.randomUUID(),
      color,
      layer: activeLayer.value,
    };
    if (guestbookSocket.clientId) {
      guestbookSocket.send({
        type: "stroke:start",
        clientId: guestbookSocket.clientId,
        ...activeStroke,
      });
      guestbookSocket.send({
        type: "stroke:points",
        strokeId: activeStroke.strokeId,
        points: [
          {
            from: firstSegment.from,
            to: firstSegment.to,
            size: firstSegment.size,
          },
        ],
      });
    }
  }
  sendCursorPosition(event);
  sendSelectionPreview();
  renderer.schedule();
}
//#endregion POINTER EVENTS

//#region WEBSOCKET HANDLERS
function sendSelectionPreview() {
  if (!guestbookSocket.clientId) return;
  const active = pointer.active;
  guestbookSocket.send({
    type: "selection:preview",
    clientId: guestbookSocket.clientId,
    sequence: ++selectionSequence,
    ids: [...selectedPathIds.value],
    offset: active?.mode === "move" ? active.moveOffset : { x: 0, y: 0 },
    marquee:
      active?.mode === "marquee" &&
      active.lastWorldPosition &&
      active.marqueeEnd
        ? { from: active.lastWorldPosition, to: active.marqueeEnd }
        : null,
  });
}

function handleWebsocketMessage(event: MessageEvent) {
  try {
    const message: GuestbookServerMessage = JSON.parse(event.data);
    switch (message.type) {
      case "error":
        showToast({ message: message.message, type: "error" });
        break;
      case "fill:result":
        if (message.result === "unbounded")
          console.info(
            "Fill rejected: region is not enclosed on the selected layer.",
          );
        break;
      case "drawing:state":
        if (drawingEpoch !== message.epoch) {
          drawingEpoch = message.epoch;
          lastDrawingRevision = -1;
        }
        if (message.revision < lastDrawingRevision) break;
        lastDrawingRevision = message.revision;
        if (message.operation) {
          const { clientId, operationId, type } = message.operation;
          if (type === "stroke:commit") {
            pendingStrokes.delete(operationId);
            otherStrokes.delete(operationId);
          } else if (type === "paths:move") {
            pendingMoves.delete(operationId);
            const selection = otherSelections.get(clientId);
            if (selection) selection.offset = { x: 0, y: 0 };
          } else if (type === "paths:finish-move") {
            pendingFinishingMoves.delete(operationId);
          }
        }
        drawing.replaceDrawingPaths(message.paths);
        syncDrawing();
        canUndo.value =
          !!user.value && message.undoUserIds.includes(user.value.userId);
        canRedo.value =
          !!user.value && message.redoUserIds.includes(user.value.userId);
        selectionColorPreview.value = null;
        break;
      case "cursor:move":
        if (message.clientId === guestbookSocket.clientId) break;
        otherCursors[message.clientId] = {
          userId: message.userId,
          point: message.point,
          mode: message.mode,
          brushSize: message.brushSize,
        };
        break;
      case "cursor:leave":
        if (message.clientId === guestbookSocket.clientId) break;
        if (otherCursors[message.clientId])
          otherCursors[message.clientId]!.point = null;
        break;
      case "selection:preview":
        if (message.clientId === guestbookSocket.clientId) {
          if (message.sequence !== selectionSequence) break;
          const accepted = new Set(message.ids);
          const rejected = selectedPathIds.value.filter(
            (id) => !accepted.has(id),
          );
          if (rejected.length) {
            selectedPathIds.value = selectedPathIds.value.filter((id) =>
              accepted.has(id),
            );
            for (const id of rejected) selectionMovement.delete(id);
            if (!selectedPathIds.value.length) activeGroupId.value = null;
            selectionColorPreview.value = null;
            showToast({
              message: "Some drawings are no longer available for selection.",
              type: "info",
            });
          }
          break;
        }
        otherSelections.set(message.clientId, {
          userId: message.userId,
          ids: message.ids,
          offset: message.offset,
          marquee: message.marquee,
        });
        break;
      case "user:leave":
        for (const clientId of message.clientIds) {
          delete otherCursors[clientId];
          otherSelections.delete(clientId);
        }
        for (const strokeId of message.strokeIds) otherStrokes.delete(strokeId);
        break;
      case "selection:request":
        sendSelectionPreview();
        break;
      case "stroke:start":
        if (message.clientId === guestbookSocket.clientId) break;
        otherStrokes.set(message.strokeId, {
          layer: message.layer,
          color: message.color,
          segments: [],
        });
        break;
      case "stroke:points": {
        const stroke = otherStrokes.get(message.strokeId);
        if (!stroke) break;
        stroke.segments.push(
          ...message.points.map((segment) => {
            const path = new Path2D();
            path.moveTo(segment.from.x, segment.from.y);
            path.lineTo(segment.to.x, segment.to.y);
            return { ...segment, path };
          }),
        );
        break;
      }
      case "stroke:commit": {
        if (message.cancelled) otherStrokes.delete(message.strokeId);
        break;
      }
    }
    renderer.schedule();
  } catch (error) {
    console.error("Invalid guestbook event:", event.data, error);
  }
}

function sendCursorPosition(event: PointerEvent) {
  const point = getWorldPosition(event);
  if (!point || !guestbookSocket.clientId) return;
  const active = pointer.active;
  const mode =
    !isLoggedIn.value || active?.mode === "pan" || active?.mode === "move"
      ? "pointer"
      : (active?.inputMode ?? inputMode.value) === "draw" ||
          (active?.inputMode ?? inputMode.value) === "erase"
        ? "brush"
        : "pointer";
  guestbookSocket.send({
    type: "cursor:move",
    clientId: guestbookSocket.clientId,
    point,
    mode,
    brushSize:
      active?.mode === "draw"
        ? (pathDraft.at(-1)?.size ?? brushSize.value)
        : brushSize.value,
  });
}
//#endregion WEBSOCKET HANDLERS

//#region POINTER EVENTS
function handlePointerEnter(event: PointerEvent) {
  updateBrushCursor(event);
  sendCursorPosition(event);
}

function handlePointerMove(event: PointerEvent) {
  sendCursorPosition(event);
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
//#endregion POINTER EVENTS

//#region POINTER UPDATE

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
      if (activeStroke && guestbookSocket.clientId) {
        const segment = pathDraft.at(-1)!;
        guestbookSocket.send({
          type: "stroke:points",
          strokeId: activeStroke.strokeId,
          points: [{ from: segment.from, to: segment.to, size: segment.size }],
        });
      }
      pointer.active.lastWorldPosition = position;
    }
  } else if (pointer.active?.mode === "move" && canEditSelection.value) {
    const position = getWorldPosition(event);
    const start = pointer.active.lastWorldPosition;
    if (position && start && selectedPathIds.value.length) {
      pointer.active.moveOffset = {
        x: position.x - start.x,
        y: position.y - start.y,
      };
      sendSelectionPreview();
    }
  } else if (pointer.active?.mode === "marquee") {
    pointer.active.marqueeEnd = getWorldPosition(event);
    sendSelectionPreview();
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
  const elevatedIds = new Set([
    ...selectedPathIds.value,
    ...[...pendingFinishingMoves.values()].flat(),
  ]);
  for (let layer = LAYER_COUNT; layer >= 1 && !hit; layer--) {
    hit = committedPaths.value
      .filter((path) => path.layer === layer)
      .sort(
        (left, right) =>
          Number(elevatedIds.has(left.id)) - Number(elevatedIds.has(right.id)),
      )
      .reverse()
      .find((path) => context.isPointInPath(path.path, position.x, position.y));
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
  if (guestbookSocket.clientId) {
    guestbookSocket.send({
      type: "cursor:leave",
      clientId: guestbookSocket.clientId,
    });
  }
  pointer.position = null;
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
      const completedStroke = activeStroke;
      if (completedStroke && guestbookSocket.clientId) {
        pendingStrokes.set(completedStroke.strokeId, {
          layer: completedStroke.layer,
          color: completedStroke.color,
          segments: pathDraft,
        });
        guestbookSocket.sendEdit({
          type: "stroke:commit",
          strokeId: completedStroke.strokeId,
          segments: pathDraft.map(({ from, to, size }) => ({
            from,
            to,
            size,
          })),
          color: completedStroke.color,
          layer: completedStroke.layer,
        });
      }
      activeStroke = null;
    } else if (
      active.mode === "fill" &&
      active.lastWorldPosition &&
      event.type === "pointerup"
    ) {
      guestbookSocket.sendEdit({
        type: "fill:commit",
        point: active.lastWorldPosition,
        color: active.color,
        layer: activeLayer.value,
      });
    } else if (
      active.mode === "move" &&
      canEditSelection.value &&
      selectedPathIds.value.length &&
      event.type !== "pointercancel" &&
      event.type !== "lostpointercapture"
    ) {
      const operationId = guestbookSocket.sendEdit({
        type: "paths:move",
        ids: [...selectedPathIds.value],
        dx: active.moveOffset.x,
        dy: active.moveOffset.y,
      });
      if (operationId) {
        for (const id of selectedPathIds.value) {
          const previous = selectionMovement.get(id) ?? { x: 0, y: 0 };
          selectionMovement.set(id, {
            x: previous.x + active.moveOffset.x,
            y: previous.y + active.moveOffset.y,
          });
        }
        pendingMoves.set(operationId, {
          ids: [...selectedPathIds.value],
          offset: active.moveOffset,
        });
      }
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
    if (
      active.mode !== "move" ||
      event.type === "pointercancel" ||
      event.type === "lostpointercapture"
    )
      sendSelectionPreview();
    renderer.schedule();
    sendCursorPosition(event);
  }
}
//#endregion POINTER UPDATE

//#region DRAWING SYNC
function syncDrawing() {
  committedPaths.value = drawing.paths.map(
    ({ id, ownerId, color, layer, groupId, pathData, bounds }) => ({
      id,
      ownerId,
      color,
      layer,
      groupId,
      path: new Path2D(pathData),
      bounds,
    }),
  );
  if (
    activeGroupId.value &&
    !committedPaths.value.some((path) => path.groupId === activeGroupId.value)
  ) {
    activeGroupId.value = null;
  }
  const selectableIds = new Set(
    committedPaths.value.filter(canSelectPath).map(({ id }) => id),
  );
  const previousIds = selectedPathIds.value;
  selectedPathIds.value = previousIds.filter((id) => selectableIds.has(id));
  if (selectedPathIds.value.length !== previousIds.length) {
    for (const id of previousIds) {
      if (!selectableIds.has(id)) selectionMovement.delete(id);
    }
    if (!selectedPathIds.value.length) activeGroupId.value = null;
    sendSelectionPreview();
  }
  if (selectedPaths.value.length === 1 && selectedPath.value) {
    activeLayer.value = selectedPath.value.layer;
  }
  renderer.schedule();
}
//#endregion DRAWING SYNC

//#region TOAST NOTIFICATIONS
function dismissToast() {
  toastRequest++;
  clearTimeout(toastTimer);
  toastMessage.value = null;
}

function showToast(message: Toast) {
  dismissToast();
  toastMessage.value = message;
  toastTimer = setTimeout(dismissToast, 4000);
  return toastRequest;
}

async function showOwnershipToast(ownerId: string) {
  const owner = await getPublicUser(ownerId);
  if (owner) {
    showToast({
      message: `This drawing is owned by ${owner.displayName}, ask them to unlock it`,
      type: "info",
    });
  } else {
    showToast({
      message: "This drawing is owned by another user, ask them to unlock it!",
      type: "info",
    });
  }
}
//#endregion TOAST NOTIFICATIONS

//#region TOOLS AND KEYBOARD SHORTCUTS
function setInputMode(mode: GuestbookInputMode) {
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

function undo() {
  if (interactionActive.value || !canUndo.value) return;
  guestbookSocket.sendEdit({ type: "drawing:undo" });
}

function redo() {
  if (interactionActive.value || !canRedo.value) return;
  guestbookSocket.sendEdit({ type: "drawing:redo" });
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
  const mode = getGuestbookInputModeForKey(event.code);
  if (mode) setInputMode(mode);
}
//#endregion TOOLS AND KEYBOARD SHORTCUTS

//#region POINTER UP AND DOUBLE-CLICK
function handlePointerUp(event: PointerEvent) {
  if (pointer.active?.id === event.pointerId) {
    updatePointer(event);
    updateBrushCursor(event);
  }
  endPointer(event);
}

function handleDoubleClick(event: MouseEvent) {
  if (
    !isLoggedIn.value ||
    inputMode.value !== "select" ||
    !activeGroupId.value ||
    event.button !== 0
  )
    return;
  const position = getWorldPosition(event);
  const hitPath = position ? findPathAt(position) : null;
  if (!hitPath || hitPath.groupId !== activeGroupId.value) return;
  if (!canSelectPath(hitPath)) return;
  if (
    selectedPathIds.value.length === 1 &&
    selectedPathIds.value[0] === hitPath.id
  )
    return;

  clearSelection();
  setSelection([hitPath.id], hitPath.groupId);
  activeLayer.value = hitPath.layer;
  renderer.schedule();
}
//#endregion POINTER UP AND DOUBLE-CLICK
</script>
