import { CANVAS_COLORS } from "../constants";
import type { BrushSegment } from "@echolotl/flashish";

export interface Point {
  x: number;
  y: number;
}

export interface Camera extends Point {
  zoom: number;
}

export type InputMode = "draw" | "erase" | "select" | "pan";

export interface RenderedPath {
  id: number;
  path: Path2D;
  color: string;
  layer: number;
  bounds: Point & { width: number; height: number };
}

interface RenderState {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  camera: Camera;
  layerCount: number;
  activeLayer: number;
  paths: RenderedPath[];
  selectedPaths: RenderedPath[];
  selectionBounds: RenderedPath["bounds"] | null;
  inputMode: InputMode;
  eyedropperActive: boolean;
  activePointer: {
    mode: "draw" | "pan" | "move" | "marquee";
    inputMode: InputMode;
    color: string;
    moveOffset: Point;
    lastWorldPosition: Point | null;
    marqueeEnd: Point | null;
  } | null;
  brushPosition: Point | null;
  brushSize: number;
  pathDraft: (BrushSegment & { path: Path2D })[];
}

export function createCanvasRenderer(getState: () => RenderState) {
  let frame: number | null = null;
  let backdrop: CanvasPattern | null = null;
  let eraseCanvas: OffscreenCanvas | null = null;

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
    const pixelMarginX = 1 / (camera.zoom * scaleX);
    const pixelMarginY = 1 / (camera.zoom * scaleY);
    const viewport = {
      left: camera.x - pixelMarginX,
      top: camera.y - pixelMarginY,
      right: camera.x + canvas.clientWidth / camera.zoom + pixelMarginX,
      bottom: camera.y + canvas.clientHeight / camera.zoom + pixelMarginY,
    };
    const isVisible = (
      left: number,
      top: number,
      right: number,
      bottom: number,
    ) =>
      right >= viewport.left &&
      left <= viewport.right &&
      bottom >= viewport.top &&
      top <= viewport.bottom;
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
    if (!backdrop) backdrop = createDotBackdrop(context, camera);
    context.fillStyle = backdrop || "transparent";
    context.fillRect(
      camera.x,
      camera.y,
      canvas.clientWidth / camera.zoom,
      canvas.clientHeight / camera.zoom,
    );
    const moveOffset =
      activePointer?.mode === "move" ? activePointer.moveOffset : null;
    const selectedIds = new Set(selectedPaths.map(({ id }) => id));
    for (let layer = 1; layer <= layerCount; layer++) {
      const erasing =
        layer === activeLayer &&
        activePointer?.mode === "draw" &&
        activePointer.inputMode === "erase";
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
          camera.zoom * scaleX,
          0,
          0,
          camera.zoom * scaleY,
          -camera.x * camera.zoom * scaleX,
          -camera.y * camera.zoom * scaleY,
        );
        // @ts-ignore-next-line: whatever the canvases are basically the same
        layerContext = eraseContext;
      }
      for (const { id, path, color, layer: pathLayer, bounds } of paths) {
        if (layer !== pathLayer) continue;
        const offset = selectedIds.has(id) ? moveOffset : null;
        const x = bounds.x + (offset?.x ?? 0);
        const y = bounds.y + (offset?.y ?? 0);
        if (!isVisible(x, y, x + bounds.width, y + bounds.height)) continue;
        layerContext.save();
        if (offset) {
          layerContext.translate(offset.x, offset.y);
        }
        layerContext.fillStyle =
          color === "primary" ? CANVAS_COLORS.primary : color;
        layerContext.fill(path);
        layerContext.restore();
      }
      if (layer === activeLayer && activePointer?.mode === "draw") {
        if (erasing) layerContext.globalCompositeOperation = "destination-out";
        for (const { path, size, from, to } of pathDraft) {
          const radius = size / 2;
          if (
            !isVisible(
              Math.min(from.x, to.x) - radius,
              Math.min(from.y, to.y) - radius,
              Math.max(from.x, to.x) + radius,
              Math.max(from.y, to.y) + radius,
            )
          )
            continue;
          layerContext.strokeStyle = activePointer.color;
          layerContext.lineWidth = size;
          layerContext.lineCap = "round";
          layerContext.lineJoin = "round";
          layerContext.stroke(path);
        }
        if (erasing) layerContext.globalCompositeOperation = "source-over";
      }
      if (erasing && eraseCanvas) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(eraseCanvas, 0, 0);
        context.restore();
      }
    }

    drawInfobox(context, camera);

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
