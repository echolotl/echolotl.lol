import { CANVAS_COLORS } from "../constants";
import type { BrushSegment } from "@echolotl/flashish";
import { cameraViewport } from "../canvas/camera";
import type { Camera, Rect } from "../canvas";

import type {
  RenderedPath,
  SelectionPreview,
  GuestbookInputMode,
  OtherCursor,
  OtherStroke,
  PendingMove,
} from ".";
import type { Point } from "@echolotl/types";

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
  groupSelectionId: string | null;
  inputMode: GuestbookInputMode;
  eyedropperActive: boolean;
  activePointer: {
    mode: "draw" | "pan" | "move" | "marquee" | "fill";
    inputMode: GuestbookInputMode;
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
  pendingStrokes: Map<string, OtherStroke>;
  otherSelections: Map<string, SelectionPreview>;
  pendingMoves: Map<string, PendingMove>;
  pendingFinishingMoves: Map<string, number[]>;
}

export class GuestbookRenderer {
  private frame: number | null = null;
  private backdrop: CanvasPattern | null = null;
  private eraseCanvas: OffscreenCanvas | null = null;

  constructor(private readonly getState: () => RenderState) {}

  /**
   * Draws the current state of the canvas.
   */
  private draw() {
    const {
      canvas,
      context,
      camera,
      layerCount,
      activeLayer,
      paths,
      selectedPaths,
      selectionBounds,
      groupSelectionId,
      inputMode,
      eyedropperActive,
      activePointer,
      brushPosition,
      brushSize,
      pathDraft,
      otherCursors,
      otherStrokes,
      pendingStrokes,
      otherSelections,
      pendingMoves,
      pendingFinishingMoves,
    } = this.getState();
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
    if (!this.backdrop) this.backdrop = createDotBackdrop(context, camera);
    context.fillStyle = this.backdrop || "transparent";
    context.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    const moveOffset =
      activePointer?.mode === "move" ? activePointer.moveOffset : null;
    const selectedIds = new Set(selectedPaths.map(({ id }) => id));
    const finishingIds = new Set([...pendingFinishingMoves.values()].flat());
    const pendingMoveList = [...pendingMoves.values()];
    const remoteSelectionList = [...otherSelections.values()];
    const offsetForPath = (id: number) => {
      if (moveOffset && selectedIds.has(id)) return moveOffset;
      return (
        pendingMoveList.find((move) => move.ids.includes(id))?.offset ??
        remoteSelectionList.find((selection) => selection.ids.includes(id))
          ?.offset ??
        null
      );
    };
    for (let layer = 1; layer <= layerCount; layer++) {
      const otherLayerStrokes = [
        ...otherStrokes.values(),
        ...pendingStrokes.values(),
      ].filter((stroke) => stroke.layer === layer);
      const erasing =
        (layer === activeLayer &&
          activePointer?.mode === "draw" &&
          activePointer.inputMode === "erase") ||
        otherLayerStrokes.some((stroke) => stroke.color === null);
      let layerContext = context;
      if (erasing) {
        if (!this.eraseCanvas)
          this.eraseCanvas = new OffscreenCanvas(width, height);
        if (this.eraseCanvas.width !== width) this.eraseCanvas.width = width;
        if (this.eraseCanvas.height !== height)
          this.eraseCanvas.height = height;
        const eraseContext = this.eraseCanvas.getContext("2d");
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
      const layerPaths = paths.filter(
        ({ layer: pathLayer }) => layer === pathLayer,
      );
      layerPaths.sort(
        (left, right) =>
          Number(selectedIds.has(left.id) || finishingIds.has(left.id)) -
          Number(selectedIds.has(right.id) || finishingIds.has(right.id)),
      );
      for (const { id, path, color, bounds } of layerPaths) {
        const offset = offsetForPath(id);
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
      if (erasing && this.eraseCanvas) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(this.eraseCanvas, 0, 0);
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
      const offset =
        moveOffset ??
        pendingMoveList.find((move) =>
          move.ids.some((id) => selectedIds.has(id)),
        )?.offset;
      if (offset) context.translate(offset.x, offset.y);
      const { x, y, width, height } = selectionBounds;
      context.strokeStyle = CANVAS_COLORS.gray;
      context.strokeRect(x, y, width, height);
      context.restore();
    }
    const groupPaths = groupSelectionId
      ? paths.filter(({ groupId }) => groupId === groupSelectionId)
      : [];
    if (
      inputMode === "select" &&
      groupPaths.length > selectedPaths.length &&
      activePointer?.mode !== "marquee"
    ) {
      const bounds = groupPaths.map(({ id, bounds }) => {
        const offset = offsetForPath(id);
        return {
          x: bounds.x + (offset?.x ?? 0),
          y: bounds.y + (offset?.y ?? 0),
          width: bounds.width,
          height: bounds.height,
        };
      });
      const left = Math.min(...bounds.map(({ x }) => x));
      const top = Math.min(...bounds.map(({ y }) => y));
      const right = Math.max(...bounds.map(({ x, width }) => x + width));
      const bottom = Math.max(...bounds.map(({ y, height }) => y + height));
      context.save();
      context.strokeStyle = CANVAS_COLORS.gray;
      context.lineWidth = 1 / camera.zoom;
      context.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
      context.strokeRect(left, top, right - left, bottom - top);
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
    for (const selection of remoteSelectionList) {
      const selected = paths.filter(({ id }) => selection.ids.includes(id));
      context.save();
      context.strokeStyle = getUserColor(selection.userId);
      context.lineWidth = 1 / camera.zoom;
      if (selected.length && !selection.marquee) {
        const left = Math.min(...selected.map(({ bounds }) => bounds.x));
        const top = Math.min(...selected.map(({ bounds }) => bounds.y));
        const right = Math.max(
          ...selected.map(({ bounds }) => bounds.x + bounds.width),
        );
        const bottom = Math.max(
          ...selected.map(({ bounds }) => bounds.y + bounds.height),
        );
        context.strokeRect(
          left + selection.offset.x,
          top + selection.offset.y,
          right - left,
          bottom - top,
        );
      }
      if (selection.marquee) {
        const { from, to } = selection.marquee;
        context.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        context.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
      }
      context.restore();
    }

    if (
      brushPosition &&
      !eyedropperActive &&
      ((activePointer?.inputMode ?? inputMode) === "draw" ||
        (activePointer?.inputMode ?? inputMode) === "erase") &&
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
  schedule() {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.draw();
    });
  }

  invalidateBackdrop() {
    this.backdrop = null;
  }

  dispose() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
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
