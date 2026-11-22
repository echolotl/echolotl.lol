import { CANVAS_COLORS, CANVAS_INPUT_MODES } from "../constants";
import type { BrushSegment } from "@echolotl/flashish";
import type { GuestbookCursorMode, Point } from "@echolotl/types";
import { cameraViewport } from "./camera";
import type { PicrossInputModeDefinition } from "../picross";

export type { Point } from "@echolotl/types";

/**
 * Represents the camera's state.
 */
export interface Camera extends Point {
  zoom: number;
  rotation: number; // in radians
  flipX: boolean;
  flipY: boolean;
}

/**
 * Represents a rectangle in 2D space.
 */
export interface Rect extends Point {
  width: number;
  height: number;
}

/**
 * The possible input modes for the canvas.
 */
export type CanvasInputMode = keyof typeof CANVAS_INPUT_MODES;

/** The shared display and keyboard fields for a canvas input mode. */
export type CanvasInputModeDefinition = Pick<
  PicrossInputModeDefinition,
  "icon" | "keys"
>;

/** Gets the canvas input mode associated with a keyboard code. */
export function getCanvasInputModeForKey(
  code: string,
): CanvasInputMode | undefined {
  const definitions: Record<CanvasInputMode, CanvasInputModeDefinition> =
    CANVAS_INPUT_MODES;
  return (Object.keys(definitions) as CanvasInputMode[]).find((mode) =>
    definitions[mode].keys.includes(code),
  );
}

/**
 * A path that has been rendered after being processed.
 */
export interface RenderedPath {
  id: number;
  path: Path2D;
  color: string;
  layer: number;
  bounds: Rect;
}

export interface OtherCursor {
  userId: string;
  point: Point | null;
  mode: GuestbookCursorMode;
  brushSize: number;
}

export interface OtherStroke {
  layer: number;
  color: string | null;
  segments: (BrushSegment & { path: Path2D })[];
}

let cursorImage: HTMLImageElement | null = null;
let cursorCanvas: OffscreenCanvas | null = null;

const { getUserColor } = useAuth();

/**
 * The state of the canvas renderer and all of the elements it manages.
 */
interface RenderState {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  camera: Camera;
  layerCount: number;
  activeLayer: number;
  paths: RenderedPath[];
  selectedPaths: RenderedPath[];
  selectionBounds: RenderedPath["bounds"] | null;
  inputMode: CanvasInputMode;
  eyedropperActive: boolean;
  activePointer: {
    mode: "draw" | "pan" | "move" | "marquee";
    inputMode: CanvasInputMode;
    color: string;
    moveOffset: Point;
    lastWorldPosition: Point | null;
    marqueeEnd: Point | null;
  } | null;
  brushPosition: Point | null;
  brushSize: number;
  pathDraft: (BrushSegment & { path: Path2D })[];
  otherCursors: Record<string, OtherCursor>;
  otherStrokes: Map<string, OtherStroke>;
}

/**
 * Creates a canvas renderer that manages drawing and rendering on the canvas.
 * @param getState A function that returns the current render state.
 * @returns An object with methods to control the canvas renderer.
 */
export function createCanvasRenderer(getState: () => RenderState) {
  let frame: number | null = null;
  let backdrop: CanvasPattern | null = null;
  let eraseCanvas: OffscreenCanvas | null = null;

  /**
   * Draws the current state of the canvas.
   */
  function draw() {
    const {
      canvas,
      context,
      camera,
      layerCount,
      activeLayer,
      paths,
      selectedPaths,
      selectionBounds,
      inputMode,
      eyedropperActive,
      activePointer,
      brushPosition,
      brushSize,
      pathDraft,
      otherCursors,
      otherStrokes,
    } = getState();
    if (
      !canvas ||
      !context ||
      !canvas.clientWidth ||
      !canvas.clientHeight ||
      !CANVAS_COLORS
    )
      return;

    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * pixelRatio);
    const height = Math.round(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    const pixelMargin = Math.SQRT2 / (camera.zoom * Math.min(scaleX, scaleY));

    /**
     * Everything that the camera can see in the current viewport.
     */
    const viewport = cameraViewport(
      camera,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    viewport.x -= pixelMargin;
    viewport.y -= pixelMargin;
    viewport.width += 2 * pixelMargin;
    viewport.height += 2 * pixelMargin;

    /**
     * Checks if a rectangle defined by the given coordinates is visible within the current viewport.
     * @param rect The rectangle to check for visibility.
     * @returns True if the rectangle is visible within the viewport, false otherwise.
     */
    const isVisible = (rect: Rect) =>
      rect.x + rect.width >= viewport.x &&
      rect.x <= viewport.x + viewport.width &&
      rect.y + rect.height >= viewport.y &&
      rect.y <= viewport.y + viewport.height;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const cos = Math.cos(camera.rotation);
    const sin = Math.sin(camera.rotation);
    const flipX = camera.flipX ? -1 : 1;
    const flipY = camera.flipY ? -1 : 1;
    const a = flipX * camera.zoom * cos * scaleX;
    const b = flipY * camera.zoom * sin * scaleY;
    const c = -flipX * camera.zoom * sin * scaleX;
    const d = flipY * camera.zoom * cos * scaleY;
    context.setTransform(
      a,
      b,
      c,
      d,
      -camera.x * a - camera.y * c,
      -camera.x * b - camera.y * d,
    );
    if (!backdrop) backdrop = createDotBackdrop(context, camera);
    context.fillStyle = backdrop || "transparent";
    context.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    const moveOffset =
      activePointer?.mode === "move" ? activePointer.moveOffset : null;
    const selectedIds = new Set(selectedPaths.map(({ id }) => id));
    for (let layer = 1; layer <= layerCount; layer++) {
      const otherLayerStrokes = Array.from(otherStrokes.values()).filter(
        (stroke) => stroke.layer === layer,
      );
      const erasing =
        (layer === activeLayer &&
          activePointer?.mode === "draw" &&
          activePointer.inputMode === "erase") ||
        otherLayerStrokes.some((stroke) => stroke.color === null);
      let layerContext = context;
      if (erasing) {
        if (!eraseCanvas) eraseCanvas = new OffscreenCanvas(width, height);
        if (eraseCanvas.width !== width) eraseCanvas.width = width;
        if (eraseCanvas.height !== height) eraseCanvas.height = height;
        const eraseContext = eraseCanvas.getContext("2d");
        if (!eraseContext)
          throw new Error("Unable to create layer canvas context");
        eraseContext.setTransform(1, 0, 0, 1, 0, 0);
        eraseContext.clearRect(0, 0, width, height);
        eraseContext.setTransform(
          a,
          b,
          c,
          d,
          -camera.x * a - camera.y * c,
          -camera.x * b - camera.y * d,
        );
        // @ts-ignore-next-line: whatever the canvases are basically the same
        layerContext = eraseContext;
      }
      for (const { id, path, color, layer: pathLayer, bounds } of paths) {
        if (layer !== pathLayer) continue;
        const offset = selectedIds.has(id) ? moveOffset : null;
        const x = bounds.x + (offset?.x ?? 0);
        const y = bounds.y + (offset?.y ?? 0);
        if (!isVisible({ x, y, width: bounds.width, height: bounds.height }))
          continue;
        layerContext.save();
        if (offset) {
          layerContext.translate(offset.x, offset.y);
        }
        layerContext.fillStyle =
          color === "primary" ? CANVAS_COLORS.primary : color;
        layerContext.fill(path);
        layerContext.restore();
      }
      const drawSegments = (
        segments: (BrushSegment & { path: Path2D })[],
        color: string | null,
      ) => {
        layerContext.save();
        if (color === null)
          layerContext.globalCompositeOperation = "destination-out";
        for (const { path, size, from, to } of segments) {
          const radius = size / 2;
          if (
            !isVisible({
              x: Math.min(from.x, to.x) - radius,
              y: Math.min(from.y, to.y) - radius,
              width: Math.abs(to.x - from.x) + size,
              height: Math.abs(to.y - from.y) + size,
            })
          )
            continue;
          layerContext.strokeStyle = color ?? "#000";
          layerContext.lineWidth = size;
          layerContext.lineCap = "round";
          layerContext.lineJoin = "round";
          layerContext.stroke(path);
        }
        layerContext.restore();
      };
      if (layer === activeLayer && activePointer?.mode === "draw") {
        drawSegments(
          pathDraft,
          activePointer.inputMode === "erase" ? null : activePointer.color,
        );
      }
      for (const stroke of otherLayerStrokes) {
        drawSegments(stroke.segments, stroke.color);
      }
      if (erasing && eraseCanvas) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(eraseCanvas, 0, 0);
        context.restore();
      }
    }

    drawInfobox(context, camera);
    drawOtherCursors(context, camera, otherCursors);

    if (
      inputMode === "select" &&
      selectionBounds &&
      activePointer?.mode !== "marquee"
    ) {
      context.save();
      if (moveOffset) context.translate(moveOffset.x, moveOffset.y);
      const { x, y, width, height } = selectionBounds;
      context.strokeStyle = CANVAS_COLORS.gray;
      context.strokeRect(x, y, width, height);
      context.restore();
    }
    if (
      activePointer?.mode === "marquee" &&
      activePointer.lastWorldPosition &&
      activePointer.marqueeEnd
    ) {
      const from = activePointer.lastWorldPosition;
      const to = activePointer.marqueeEnd;
      context.save();
      context.strokeStyle = CANVAS_COLORS.gray;
      context.lineWidth = 1 / camera.zoom;
      context.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
      context.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
      context.restore();
    }

    if (
      brushPosition &&
      !eyedropperActive &&
      (activePointer?.inputMode ?? inputMode) !== "select" &&
      activePointer?.mode !== "pan"
    ) {
      context.strokeStyle = CANVAS_COLORS.gray;
      context.lineWidth = 1 / camera.zoom;
      context.beginPath();
      context.arc(
        brushPosition.x,
        brushPosition.y,
        (activePointer?.mode === "draw"
          ? (pathDraft.at(-1)?.size ?? brushSize)
          : brushSize) / 2,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
  }

  /**
   * Schedules a draw call on the next animation frame.
   */
  function schedule() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      draw();
    });
  }

  return {
    schedule,
    invalidateBackdrop() {
      backdrop = null;
    },
    dispose() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}

/**
 * Draws the infobox on the canvas.
 * @param context The canvas rendering context to draw on.
 * @param camera The current camera state.
 */
function drawInfobox(context: CanvasRenderingContext2D, camera: Camera) {
  if (!CANVAS_COLORS) return;
  context.save();
  context.fillStyle = CANVAS_COLORS.surface;
  context.strokeStyle = CANVAS_COLORS.distant;
  context.lineWidth = 3 / camera.zoom;
  context.beginPath();
  context.roundRect(-100, -50, 200, 100, 8);
  context.stroke();
  context.fill();
  context.fillStyle = CANVAS_COLORS.text;
  context.font = "24px Lotl";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("temp", 0, 0);
  context.restore();
}

function drawOtherCursors(
  context: CanvasRenderingContext2D,
  camera: Camera,
  otherCursors: Record<string, OtherCursor>,
) {
  if (!CANVAS_COLORS) return;
  for (const cursor of Object.values(otherCursors)) {
    if (!cursor.point) continue;
    const color = getUserColor(cursor.userId);
    if (cursor.mode === "brush") {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = 1 / camera.zoom;
      context.beginPath();
      context.arc(
        cursor.point.x,
        cursor.point.y,
        cursor.brushSize / 2,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
      continue;
    }

    if (typeof Image === "undefined") continue;
    if (!cursorImage) {
      cursorImage = new Image();
      cursorImage.src = "/images/icons/cursor.webp";
    }
    const image = cursorImage;
    if (!image?.complete || !image.naturalWidth) continue;

    if (
      !cursorCanvas ||
      cursorCanvas.width !== image.naturalWidth ||
      cursorCanvas.height !== image.naturalHeight
    ) {
      cursorCanvas = new OffscreenCanvas(
        image.naturalWidth,
        image.naturalHeight,
      );
    }

    const cursorContext = cursorCanvas.getContext("2d");
    if (!cursorContext)
      throw new Error("Unable to create cursor canvas context");
    cursorContext.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    cursorContext.globalCompositeOperation = "source-over";
    cursorContext.drawImage(image, 0, 0);
    cursorContext.globalCompositeOperation = "source-in";
    cursorContext.fillStyle = color;
    cursorContext.fillRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    cursorContext.globalCompositeOperation = "source-over";

    context.drawImage(cursorCanvas, cursor.point.x, cursor.point.y);
  }
}

/**
 * Creates the repeating dot backdrop pattern for the canvas.
 * @param context The canvas rendering context to create the pattern for.
 * @param camera The current camera state.
 * @returns The created repeating dot pattern, or null if it couldn't be created.
 */
function createDotBackdrop(context: CanvasRenderingContext2D, camera: Camera) {
  if (!CANVAS_COLORS) return null;
  const scaleX = context.canvas.width / context.canvas.clientWidth;
  const scaleY = context.canvas.height / context.canvas.clientHeight;
  const DOT_SIZE = 3;
  const DOT_SPACING = 48;
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
  const pattern = context.createPattern(patternCanvas, "repeat");
  pattern?.setTransform(new DOMMatrix().scale(0.5));
  return pattern;
}
