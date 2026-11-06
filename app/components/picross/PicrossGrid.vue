<template>
  <div class="picross-layout" :style="{ marginTop: `${columnHintsHeight}px` }">
    <SketchFilter id="picross-sketch" flood-color="var(--surface)" />
    <canvas
      v-if="!locked"
      ref="columnHintsCanvas"
      class="column-hints lotl-font"
      role="img"
      :aria-label="`Column hints: ${game.hints.columns.map((h) => h.join(' ')).join(', ')}`"
    ></canvas>
    <canvas
      v-if="!locked"
      ref="rowHintsCanvas"
      class="row-hints lotl-font"
      role="img"
      :aria-label="`Row hints: ${game.hints.rows.map((h) => h.join(' ')).join(', ')}`"
    ></canvas>
    <div class="game-board">
      <div class="board-backdrop" aria-hidden="true"></div>
      <div
        v-if="hoveredTile && !game.isCompleted && !locked"
        class="hover-tile"
        :class="inputMode"
        aria-hidden="true"
        :style="{
          width: `${TILE_SIZE}px`,
          height: `${TILE_SIZE}px`,
          transform: `translate(${hoveredTile.x * TILE_SIZE}px, ${hoveredTile.y * TILE_SIZE}px)`,
        }"
      ></div>
      <canvas
        ref="gameBoard"
        width="300"
        height="300"
        role="grid"
        :tabindex="locked ? -1 : 0"
        :aria-label="`${editable ? 'Picross editor' : 'Picross puzzle'} board, ${game.size.width} columns by ${game.size.height} rows`"
        aria-describedby="picross-board-help"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerleave="handlePointerLeave"
        @keydown="handleBoardKeydown"
        @contextmenu.prevent
      ></canvas>
    </div>
    <p id="picross-board-help" class="sr-only">
      Use the arrow keys to select a tile. Press Space or Enter to apply the
      selected input mode. Use B, M, E, or P to change modes.
    </p>
    <p class="sr-only" role="status" aria-live="polite">
      {{ boardAnnouncement }}
    </p>
    <div v-if="metadataInfo" class="metadata text-secondary">
      <span v-if="metadataInfo.title"
        >"<b>{{ metadataInfo.title }}</b
        >"</span
      >
      <template v-if="metadataInfo.author">
        by <strong class="lotl-font">{{ metadataInfo.author }}</strong>
      </template>
      <template v-if="metadataInfo.source">
        - from
        <a
          v-if="metadataInfo.source.url"
          :href="metadataInfo.source.url"
          target="_blank"
          rel="noopener noreferrer"
          ><strong>{{ metadataInfo.source.name }}</strong></a
        >
        <strong v-else>{{ metadataInfo.source.name }}</strong>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import SketchFilter from "~/components/ui/SketchFilter.vue";
import { useTheme } from "~/composables/useTheme";
import { createSoundPlayer, type SoundPlayer } from "~/utils/audio";
import {
  BOARD_COLORS,
  COLUMN_HINTS_PADDING,
  DEFAULT_INPUT_MODE,
  HINT_FONT_SIZE,
  HINT_LINE_HEIGHT,
  initializeBoardColors,
  INPUT_MODES,
  PAINT_DOT_SIZE,
  REVEAL_PAUSE_MS,
  REVEAL_PULSE_MS,
  ROW_HINT_GAP,
  ROW_HINTS_PADDING,
  TILE_SIZE,
  UNDO_HISTORY_LIMIT,
} from "~/utils/constants";
import { prefersReducedMotion, toSafeHTTPUrl } from "~/utils/index";
import {
  applyTileChange,
  getHints,
  getInputModeForKey,
  getPaletteColor,
  getSolvedHints,
  isBoardSolved,
  isLineOverfilled,
  type InputMode,
  type PicrossGame,
  type PicrossTile,
  type PicrossTileChange,
  type PicrossTileState,
} from "~/utils/picross";

/**
 * PICROSS GRID THINGS TO BE KNOWN:
 * - The grid mutates the game it is given.
 * - While locked, the board is shown without hints and can't be played.
 * - While editable, tiles edit the solution directly and the hints follow it.
 */

const props = defineProps<{
  game: PicrossGame;
  locked?: boolean;
  editable?: boolean;
  paintIndex?: number | null;
}>();

const { theme } = useTheme();

/**
 * A computed property that formats the metadata information for display.
 */
const metadataInfo = computed(() => {
  const metadata = props.game.metadata;
  if (!metadata) return null;
  const { title, author, source } = metadata;
  const authorName = author?.name;
  const sourceInfo = source?.name
    ? { name: source.name, url: toSafeHTTPUrl(source.url) }
    : null;
  if (!title && !authorName && !sourceInfo) return null;
  return { title, author: authorName, source: sourceInfo };
});

/**
 * The currently selected input mode for the Picross grid.
 */
const inputMode = ref<InputMode>(DEFAULT_INPUT_MODE);

/**
 * The target height of the column hints area, including padding.
 * This is not applied immediately if `stroke` is not null.
 */
const targetColumnHintsHeight = computed(
  () =>
    Math.max(0, ...props.game.hints.columns.map((h) => h.length)) *
      HINT_LINE_HEIGHT +
    COLUMN_HINTS_PADDING * 2,
);

/**
 * The actual height of the column hints area, which may lag behind the target height while `stroke` is not null.
 */
const columnHintsHeight = ref(targetColumnHintsHeight.value);

/**
 * The image used for the mark tile.
 */
let markImage: HTMLImageElement | null = null;

/**
 * The sound player instance.
 * @see {@link SoundPlayer}
 */
let sound: SoundPlayer | null = null;
/**
 * The individual sounds for placing tiles.
 */
let placeSounds: AudioBuffer[] = [];

/**
 * A single change to a tile, used for undo/redo history.
 */
interface TileChange {
  x: number;
  y: number;
  prev: PicrossTile;
  next: PicrossTile;
}
/**
 * The undo history stack, each entry representing a pointer stroke.
 */
let undoStack: TileChange[][] = [];
const undoCount = ref(0); // for the undo button display
/**
 * The redo history stack, each entry representing a pointer stroke.
 */
let redoStack: TileChange[][] = [];
const redoCount = ref(0); // for the redo button display
/**
 * The current pointer stroke being recorded.
 */
let stroke: TileChange[] | null = null;

/**
 * Helper function to synchronize the undo and redo counts with their respective stacks.
 */
function syncHistoryCounts() {
  undoCount.value = undoStack.length;
  redoCount.value = redoStack.length;
}

/**
 * Commits the current pointer stroke to the undo stack and clears the redo stack.
 */
function commitStroke() {
  if (stroke?.length) {
    undoStack.push(stroke);
    if (undoStack.length > UNDO_HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    syncHistoryCounts();
  }
  stroke = null;
  columnHintsHeight.value = targetColumnHintsHeight.value;
}

/**
 * Clears the undo and redo history stacks and resets the current stroke.
 */
function clearHistory() {
  undoStack = [];
  redoStack = [];
  stroke = null;
  columnHintsHeight.value = targetColumnHintsHeight.value;
  syncHistoryCounts();
}

// #region HINT CANVASES

/**
 * The column hints canvas element.
 * TODO: Make it so the context is only created initially, and reused
 */
const columnHintsCanvas = shallowRef<HTMLCanvasElement | null>(null);
/**
 * The row hints canvas element.
 * TODO: Make it so the context is only created initially, and reused
 */
const rowHintsCanvas = shallowRef<HTMLCanvasElement | null>(null);

/**
 * A computed property that tracks which hints are solved. (grayed out)
 */
const solvedHints = computed(() => {
  const { board, hints } = props.game;
  // The board always matches the solution when editing, so nothing is "solved"
  if (props.editable) {
    return {
      rows: hints.rows.map((rowHints) => rowHints.map(() => false)),
      columns: hints.columns.map((columnHints) => columnHints.map(() => false)),
    };
  }
  return {
    rows: hints.rows.map((rowHints, row) =>
      getSolvedHints(board[row] ?? [], rowHints),
    ),
    columns: hints.columns.map((columnHints, column) =>
      getSolvedHints(
        board.map((row) => row[column] ?? "empty"),
        columnHints,
      ),
    ),
  };
});

/**
 * A computed property that tracks which lines have all their hints solved but still have unmarked tiles. (gray but outlined)
 */
const unmarkedLines = computed(() => {
  const { board } = props.game;
  const needsMarks = (
    line: PicrossTileState[],
    solved: boolean[] | undefined,
  ) => !!solved?.length && solved.every(Boolean) && line.includes("empty");
  return {
    rows: solvedHints.value.rows.map((solved, row) =>
      needsMarks(board[row] ?? [], solved),
    ),
    columns: solvedHints.value.columns.map((solved, column) =>
      needsMarks(
        board.map((row) => row[column] ?? "empty"),
        solved,
      ),
    ),
  };
});

/**
 * A computed property that tracks which lines are overfilled and thus incorrect. (red)
 */
const incorrectLines = computed(() => {
  const { board, hints } = props.game;
  return {
    rows: hints.rows.map((rowHints, row) =>
      isLineOverfilled(board[row] ?? [], rowHints),
    ),
    columns: hints.columns.map((columnHints, column) =>
      isLineOverfilled(
        board.map((row) => row[column] ?? "empty"),
        columnHints,
      ),
    ),
  };
});

/**
 * A computed property that generates a unique key based on the current state of solved hints, unmarked lines, and incorrect lines.
 * This determines when the hint canvases need to be redrawn.
 */
const solvedHintsKey = computed(() =>
  JSON.stringify([
    props.game.hints,
    solvedHints.value,
    unmarkedLines.value,
    incorrectLines.value,
  ]),
);

/**
 * Helper function to draw a hint on the canvas with appropriate styling based on its state.
 * @param hintCtx The canvas rendering context to draw on.
 * @param text The text of the hint to draw.
 * @param x The x-coordinate to draw the hint at.
 * @param y The y-coordinate to draw the hint at.
 * @param solved Whether the hint is solved.
 * @param outlined Whether the hint should be outlined.
 * @param incorrect Whether the hint is incorrect.
 */
function drawHint(
  hintCtx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  solved: boolean | undefined,
  outlined: boolean,
  incorrect: boolean,
) {
  if (outlined) {
    hintCtx.strokeStyle = incorrect
      ? BOARD_COLORS!.incorrect
      : BOARD_COLORS!.stripe;
    hintCtx.lineWidth = 3;
    hintCtx.lineJoin = "round";
    hintCtx.globalAlpha = 0.5;
    hintCtx.strokeText(text, x, y);
    hintCtx.globalAlpha = 1;
  }
  hintCtx.fillStyle = incorrect
    ? BOARD_COLORS!.incorrect
    : solved
      ? BOARD_COLORS!.solvedHint
      : BOARD_COLORS!.text;
  hintCtx.fillText(text, x, y);
}

/**
 * Prepares a hint canvas for drawing by setting its size and context.
 * @param canvas The canvas element to prepare.
 * @param width The desired width of the canvas in CSS pixels.
 * @param height The desired height of the canvas in CSS pixels.
 * @returns The prepared canvas rendering context, or null if it couldn't be obtained.
 */
function prepareHintCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.ceil(width * dpr));
  canvas.height = Math.max(1, Math.ceil(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const hintCtx = canvas.getContext("2d");
  if (!hintCtx) return null;
  hintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hintCtx.textBaseline = "middle";
  return hintCtx;
}

/**
 * Draws the column and row hints on their respective canvases.
 */
function drawHints() {
  const columnCanvas = columnHintsCanvas.value;
  const rowCanvas = rowHintsCanvas.value;
  if (!columnCanvas || !rowCanvas) return;

  const { hints, size } = props.game;
  const fontFamily = window.getComputedStyle(columnCanvas).fontFamily;
  const font = `${HINT_FONT_SIZE}px ${fontFamily}`;

  const columnHeight = columnHintsHeight.value;
  const columnCtx = prepareHintCanvas(
    columnCanvas,
    size.width * TILE_SIZE,
    columnHeight,
  );
  if (columnCtx) {
    columnCtx.font = font;
    columnCtx.textAlign = "center";
    hints.columns.forEach((columnHints, column) => {
      const columnSolvedHints = solvedHints.value.columns[column] ?? [];
      const isColumnSolved =
        columnSolvedHints.length > 0 && columnSolvedHints.every(Boolean);
      columnHints.forEach((hint, index) => {
        const fromBottom = columnHints.length - 1 - index;
        drawHint(
          columnCtx,
          String(hint),
          column * TILE_SIZE + TILE_SIZE / 2,
          columnHeight -
            COLUMN_HINTS_PADDING -
            fromBottom * HINT_LINE_HEIGHT -
            HINT_LINE_HEIGHT / 2,
          columnSolvedHints[index],
          (unmarkedLines.value.columns[column] ||
            incorrectLines.value.columns[column]) ??
            false,
          incorrectLines.value.columns[column] ?? false,
        );
      });
      // if solved, draw a line through the column hints
      if (isColumnSolved && !unmarkedLines.value.columns[column]) {
        columnCtx.strokeStyle = BOARD_COLORS!.solvedHint ?? "black";
        columnCtx.lineWidth = 2;
        columnCtx.beginPath();
        const bottom = columnHeight - COLUMN_HINTS_PADDING;
        columnCtx.moveTo(
          column * TILE_SIZE + TILE_SIZE / 2,
          bottom - columnHints.length * HINT_LINE_HEIGHT,
        );
        columnCtx.lineTo(column * TILE_SIZE + TILE_SIZE / 2, bottom);
        columnCtx.stroke();
      }
    });
  }

  // Measure with a scratch context so the canvas can be sized before drawing
  const measureCtx = new OffscreenCanvas(1, 1).getContext("2d");
  if (!measureCtx) return;
  measureCtx.font = font;
  const rowWidths = hints.rows.map((rowHints) =>
    rowHints.reduce(
      (total, hint, index) =>
        total +
        measureCtx.measureText(String(hint)).width +
        (index > 0 ? ROW_HINT_GAP : 0),
      0,
    ),
  );
  const rowWidth = Math.ceil(Math.max(0, ...rowWidths)) + ROW_HINTS_PADDING;
  const rowCtx = prepareHintCanvas(
    rowCanvas,
    rowWidth,
    size.height * TILE_SIZE,
  );
  if (!rowCtx) return;
  rowCtx.font = font;
  rowCtx.textAlign = "right";
  hints.rows.forEach((rowHints, row) => {
    const rowSolvedHints = solvedHints.value.rows[row] ?? [];
    const isRowSolved =
      rowSolvedHints.length > 0 && rowSolvedHints.every(Boolean);
    let right = rowWidth - ROW_HINTS_PADDING;
    for (let index = rowHints.length - 1; index >= 0; index--) {
      const text = String(rowHints[index]);
      drawHint(
        rowCtx,
        text,
        right,
        row * TILE_SIZE + TILE_SIZE / 2,
        solvedHints.value.rows[row]?.[index],
        (unmarkedLines.value.rows[row] || incorrectLines.value.rows[row]) ??
          false,
        incorrectLines.value.rows[row] ?? false,
      );
      right -= rowCtx.measureText(text).width + ROW_HINT_GAP;
    }

    // if solved, draw a line through the row hints
    if (isRowSolved && !unmarkedLines.value.rows[row]) {
      rowCtx.strokeStyle = BOARD_COLORS!.solvedHint ?? "black";
      rowCtx.lineWidth = 2;
      rowCtx.beginPath();
      const lineRight = rowWidth - ROW_HINTS_PADDING;
      rowCtx.moveTo(
        lineRight - (rowWidths[row] ?? 0),
        row * TILE_SIZE + TILE_SIZE / 2,
      );
      rowCtx.lineTo(lineRight, row * TILE_SIZE + TILE_SIZE / 2);
      rowCtx.stroke();
    }
  });
}
// #endregion HINT CANVASES

// #region MAIN CANVAS

/**
 * The main game board canvas element.
 */
const gameBoard = shallowRef<HTMLCanvasElement | null>(null);
/**
 * The 2D rendering context for the main game board canvas.
 */
let ctx: CanvasRenderingContext2D | null = null;
/**
 * The offscreen canvas used for drawing marks on the game board.
 */
let markCanvas: OffscreenCanvas | null = null;
/**
 * The 2D rendering context for the offscreen mark canvas.
 */
let markCtx: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Initializes the main game board canvas and the offscreen mark canvas.
 * Called when the component is mounted to set up the canvases.
 */
function initializeCanvas() {
  if (gameBoard.value) {
    ctx = gameBoard.value.getContext("2d");
    markCanvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
    markCtx = markCanvas.getContext("2d");
  }
}

/**
 * The `requestAnimationFrame` ID for the scheduled board redraw.
 */
let boardFrame: number | null = null;

/**
 * The board should only be drawn **AT MOST** once per animation frame.
 * This function schedules a board redraw using requestAnimationFrame.
 */
function scheduleDrawBoard() {
  if (boardFrame !== null) return;
  boardFrame = requestAnimationFrame(() => {
    boardFrame = null;
    drawBoard();
  });
}

/**
 * Actually draws the game board on the main canvas.
 */
function drawBoard() {
  if (!ctx || !gameBoard.value) return;
  const { board, size, palette } = props.game;

  const CANVAS_WIDTH = size.width * TILE_SIZE;
  const CANVAS_HEIGHT = size.height * TILE_SIZE;
  const DPR = window.devicePixelRatio || 1;
  const pixelWidth = Math.ceil(CANVAS_WIDTH * DPR);
  const pixelHeight = Math.ceil(CANVAS_HEIGHT * DPR);

  // Resizing clears and reallocates the canvas, so only do it when needed
  if (
    gameBoard.value.width !== pixelWidth ||
    gameBoard.value.height !== pixelHeight
  ) {
    gameBoard.value.width = pixelWidth;
    gameBoard.value.height = pixelHeight;
    gameBoard.value.style.width = `${CANVAS_WIDTH}px`;
    gameBoard.value.style.height = `${CANVAS_HEIGHT}px`;
  }

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = BOARD_COLORS!.line;

  // Draw checkered background for the grid
  ctx.fillStyle = BOARD_COLORS!.stripe;
  ctx.globalAlpha = 0.05;
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  ctx.globalAlpha = 1;

  // Draw dividing lines
  for (let y = 1; y < size.height; y++) {
    ctx.lineWidth = y % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y * TILE_SIZE);
    ctx.lineTo(CANVAS_WIDTH, y * TILE_SIZE);
    ctx.stroke();
  }
  for (let x = 1; x < size.width; x++) {
    ctx.lineWidth = x % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x * TILE_SIZE, 0);
    ctx.lineTo(x * TILE_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Draw tiles. Once completed, the palette colors appear over the user's placed
  // tiles, then periodically pulse out to reveal those tiles underneath.
  const completed = props.game.isCompleted;
  if (!completed) revealStart = null;
  const overlayAlpha = completed ? getRevealAlpha() : 1;
  const fading = completed && !prefersReducedMotion();
  const hovered = hoveredTile.value;
  /** If the mark image is ready to be drawn. */
  const markReady =
    markImage?.complete && markImage.naturalWidth > 0 && markCtx && markCanvas;
  if (markReady) {
    markCtx!.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
    markCtx!.globalCompositeOperation = "source-over";
    markCtx!.drawImage(markImage!, 0, 0, TILE_SIZE, TILE_SIZE);
    markCtx!.globalCompositeOperation = "source-in";
    markCtx!.fillStyle = BOARD_COLORS!.tile;
    markCtx!.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    markCtx!.globalCompositeOperation = "source-over";
  }

  // This is terrible and spaghetti
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const state = board[y]?.[x];
      const tileColor = getPaletteColor(palette, palette.indices[y]?.[x]);
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;

      /** If the current tile is revealed. */
      const revealed = completed && tileColor !== null;

      // Always draw filled and marked tiles.
      if (state === "filled") {
        if (props.editable) {
          ctx.fillStyle = tileColor ?? BOARD_COLORS!.tile;
        } else {
          ctx.fillStyle = BOARD_COLORS!.tile;
        }
        const TILE_INSET = 1;
        ctx.fillRect(
          left + TILE_INSET,
          top + TILE_INSET,
          TILE_SIZE - 2 * TILE_INSET,
          TILE_SIZE - 2 * TILE_INSET,
        );
      } else if (state === "marked" && markReady) {
        ctx.globalAlpha = completed ? 0.25 : 1;
        ctx.drawImage(markCanvas!, left, top);
        ctx.globalAlpha = 1;
      }

      // If the puzzle is completed and the image is revealed, draw the tile color over it.
      if (revealed) {
        ctx.fillStyle = tileColor;
        ctx.globalAlpha = overlayAlpha;
        ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1;
      } else if (props.editable && tileColor && state !== "filled") {
        // Otherwise, if the tile is editable and painted but not filled, draw the small dot.
        const isHovered = hovered?.x === x && hovered.y === y;
        const inset = (TILE_SIZE - PAINT_DOT_SIZE - (isHovered ? 6 : 0)) / 2;
        ctx.fillStyle = tileColor;
        ctx.fillRect(
          left + inset,
          top + inset,
          PAINT_DOT_SIZE + (isHovered ? 6 : 0),
          PAINT_DOT_SIZE + (isHovered ? 6 : 0),
        );
      }
    }
  }

  if (fading) scheduleDrawBoard();
}

/**
 * The timestamp when the reveal animation started. Used to calculate the reveal alpha.
 */
let revealStart: number | null = null;

/**
 * Helper function to calculate the color overlay alpha for the animation.
 * The colors are fully visible on completion, and periodically pulse out and
 * back in to reveal the placed tiles underneath.
 * @returns The overlay alpha value between 0 and 1.
 */
function getRevealAlpha() {
  if (prefersReducedMotion()) return 1;
  const now = performance.now();
  revealStart ??= now;
  const time = (now - revealStart) % (REVEAL_PAUSE_MS + REVEAL_PULSE_MS);
  if (time < REVEAL_PAUSE_MS) return 1;
  const progress = (time - REVEAL_PAUSE_MS) / REVEAL_PULSE_MS;
  return 0.5 + 0.5 * Math.cos(progress * 2 * Math.PI);
}
/**
 * The pointer ID of the currently held pointer, or null if none.
 */
let heldPointer: number | null = null;
/** The current action being applied to the board, or null if none. */
let action: PicrossTileChange | null = null;

/** The currently hovered tile, or null if none. */
const hoveredTile = ref<{ x: number; y: number } | null>(null);
const selectedTile = ref({ x: 0, y: 0 });
const boardAnnouncement = computed(() => {
  const { x, y } = selectedTile.value;
  const state = props.game.board[y]?.[x] ?? "empty";
  return `Row ${y + 1}, column ${x + 1}, ${state}. ${inputMode.value} mode selected.`;
});

// #endregion MAIN CANVAS

// #region GAME LOGIC

/** Rechecks if the board is completed and updates the game state accordingly. */
function checkIfCompleted() {
  if (props.editable || !isBoardSolved(props.game)) return;
  props.game.isCompleted = true;
  stopHold();
}

/**
 * Gets the tile at the given pointer event coordinates.
 * @param event The pointer event.
 * @returns The tile coordinates { x, y } if a tile exists at the event location, otherwise null.
 */
function getTileAt(event: PointerEvent): { x: number; y: number } | null {
  if (!gameBoard.value) return null;
  const rect = gameBoard.value.getBoundingClientRect();
  const x = Math.floor(
    ((event.clientX - rect.left) / rect.width) * props.game.size.width,
  );
  const y = Math.floor(
    ((event.clientY - rect.top) / rect.height) * props.game.size.height,
  );
  return props.game.board[y]?.[x] ? { x, y } : null;
}
/**
 * Gets the tile at the given board coordinates.
 * @param x The x-coordinate of the tile.
 * @param y The y-coordinate of the tile.
 * @returns The tile at the specified coordinates.
 */
function getTile(x: number, y: number): PicrossTile {
  return {
    state: props.game.board[y]?.[x] ?? "empty",
    color: props.game.palette.indices[y]?.[x] ?? null,
  };
}

/**
 * Sets the tile at the given board coordinates.
 * @param x The x-coordinate of the tile.
 * @param y The y-coordinate of the tile.
 * @param tile The tile data to set.
 */
function setTile(x: number, y: number, tile: PicrossTile) {
  const row = props.game.board[y];
  if (!row) return;
  row[x] = tile.state;
  if (props.editable) {
    const colorRow = props.game.palette.indices[y];
    if (colorRow) colorRow[x] = tile.color;
    const solutionRow = props.game.solution[y];
    const filled = tile.state === "filled";
    if (solutionRow && solutionRow[x] !== filled) {
      solutionRow[x] = filled;
      props.game.hints = getHints(props.game.solution);
    }
  }
}

/**
 * Applies the current action to the tile at the given board coordinates.
 * @param x The x-coordinate of the tile.
 * @param y The y-coordinate of the tile.
 */
function applyAction(x: number, y: number) {
  if (!action) return;
  const prev = getTile(x, y);
  const next = applyTileChange(prev, action);
  if (
    prev.state === next.state &&
    (!props.editable || prev.color === next.color)
  ) {
    return;
  }
  stroke?.push({ x, y, prev, next });
  setTile(x, y, next);

  if (!props.editable && next.state === "filled") {
    props.game.moves++;
  }
  if (placeSounds.length > 0) {
    sound?.play(
      placeSounds[Math.floor(Math.random() * placeSounds.length)],
      0.85 + Math.random() * 0.3,
    );
  }
  checkIfCompleted();
}

/**
 * Resolves the tile change based on the current input mode and button pressed.
 * @param current The current tile state.
 * @param button The mouse button pressed (0 for left, 2 for right).
 * @returns The resulting tile change.
 */
function resolveTile(current: PicrossTile, button: number): PicrossTileChange {
  const mode = INPUT_MODES[inputMode.value as keyof typeof INPUT_MODES];
  return mode.resolve(
    current,
    button,
    props.editable,
    props.paintIndex,
  );
}

/**
 * Handles the pointer down event on the game board.
 * @param event The pointer event.
 */
function handlePointerDown(event: PointerEvent) {
  if (props.game.isCompleted || props.locked) return;
  if (event.button !== 0 && event.button !== 2) return;
  const tile = getTileAt(event);
  if (!tile) return;
  selectedTile.value = tile;
  event.preventDefault();
  heldPointer = event.pointerId;
  stroke = [];
  gameBoard.value?.setPointerCapture(event.pointerId);
  action = resolveTile(getTile(tile.x, tile.y), event.button);
  applyAction(tile.x, tile.y);
}

/**
 * Handles the pointer move event on the game board.
 * @param event The pointer event.
 */
function handlePointerMove(event: PointerEvent) {
  if (props.game.isCompleted || props.locked) return;
  const tile = getTileAt(event);
  setHoveredTile(event.pointerType === "touch" ? null : tile);
  if (!tile || heldPointer !== event.pointerId || !action) return;
  applyAction(tile.x, tile.y);
}

function handleBoardKeydown(event: KeyboardEvent) {
  if (props.game.isCompleted || props.locked) return;
  const { width, height } = props.game.size;
  const selected = selectedTile.value;

  switch (event.key) {
    case "ArrowUp":
      selectedTile.value = { ...selected, y: Math.max(0, selected.y - 1) };
      break;
    case "ArrowDown":
      selectedTile.value = {
        ...selected,
        y: Math.min(height - 1, selected.y + 1),
      };
      break;
    case "ArrowLeft":
      selectedTile.value = { ...selected, x: Math.max(0, selected.x - 1) };
      break;
    case "ArrowRight":
      selectedTile.value = {
        ...selected,
        x: Math.min(width - 1, selected.x + 1),
      };
      break;
    case " ":
    case "Enter":
      event.preventDefault();
      stroke = [];
      action = resolveTile(getTile(selected.x, selected.y), 0);
      applyAction(selected.x, selected.y);
      action = null;
      commitStroke();
      return;
    default:
      return;
  }

  event.preventDefault();
}

/**
 * Handles the pointer leave event on the game board.
 */
function handlePointerLeave() {
  setHoveredTile(null);
}

/**
 * Handles keyboard events for input mode switching and undo/redo.
 * @param event The keyboard event.
 */
function handleKeys(event: KeyboardEvent) {
  // Don't hijack typing or native undo inside form fields
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  ) {
    return;
  }
  const mode = getInputModeForKey(event.code);
  if (mode) {
    inputMode.value = mode;
    return;
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  switch (event.code) {
    case "KeyY":
      event.preventDefault();
      handleRedo();
      break;
    case "KeyZ":
      event.preventDefault();
      if (event.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      break;
    default:
      break;
  }
}

/**
 * Determines if the history can be edited (undo/redo).
 * @returns True if history can be edited, false otherwise.
 */
function canEditHistory() {
  return !props.game.isCompleted && !props.locked && heldPointer === null;
}

/**
 * Handles the undo action.
 */
function handleUndo() {
  if (!canEditHistory()) return;
  const changes = undoStack.pop();
  if (!changes) return;
  for (let i = changes.length - 1; i >= 0; i--) {
    const { x, y, prev } = changes[i]!;
    setTile(x, y, prev);
  }
  redoStack.push(changes);
  syncHistoryCounts();
}

/**
 * Handles the redo action.
 */
function handleRedo() {
  if (!canEditHistory()) return;
  const changes = redoStack.pop();
  if (!changes) return;
  for (const { x, y, next } of changes) setTile(x, y, next);
  undoStack.push(changes);
  syncHistoryCounts();
}

/**
 * Sets the currently hovered tile.
 * @param tile The tile coordinates or null if no tile is hovered.
 */
function setHoveredTile(tile: { x: number; y: number } | null) {
  if (hoveredTile.value?.x === tile?.x && hoveredTile.value?.y === tile?.y)
    return;
  hoveredTile.value = tile;
}

function stopHold() {
  heldPointer = null;
  action = null;
  commitStroke();
}
// #endregion GAME LOGIC
// We expose certain functions and reactive properties to the parent component for UI purposes
defineExpose({
  inputMode,
  setInputMode: (mode: InputMode) => {
    inputMode.value = mode;
  },
  undo: handleUndo,
  redo: handleRedo,
  clearHistory,
  stroke,
  canUndo: computed(() => undoCount.value > 0 && canEditHistory()),
  canRedo: computed(() => redoCount.value > 0 && canEditHistory()),
});

onMounted(() => {
  markImage = new Image();
  markImage.onload = scheduleDrawBoard;
  markImage.src = "/images/icons/close.webp";

  const player = createSoundPlayer();
  sound = player;
  Promise.all(
    // why 1, 3, and 5? IDK this works fine though
    [1, 3, 5].map((i) => player.load(`/sounds/picross/click${i}.wav`)),
  ).then((buffers) => {
    placeSounds = buffers.filter((b): b is AudioBuffer => b !== null);
  });
  initializeBoardColors();
  initializeCanvas();
  drawBoard();
  drawHints();
  document.fonts?.load(`${HINT_FONT_SIZE}px Lotl`).then(drawHints); // Make sure the font is loaded before drawing hints
  window.addEventListener("pointerup", stopHold);
  window.addEventListener("pointercancel", stopHold);
  window.addEventListener("keydown", handleKeys);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerup", stopHold);
  window.removeEventListener("pointercancel", stopHold);
  window.removeEventListener("keydown", handleKeys);
  if (boardFrame !== null) cancelAnimationFrame(boardFrame);
  boardFrame = null;
  sound?.close();
  sound = null;
});

// A different game object means a new puzzle, so drop any in-progress drag
watch(
  () => props.game,
  () => {
    stopHold();
    clearHistory();
    hoveredTile.value = null;
    selectedTile.value = { x: 0, y: 0 };
  },
);

// `stroke` isn't reactive, so commitStroke/clearHistory apply the deferred height
watch(
  targetColumnHintsHeight,
  (height) => {
    if (stroke === null) columnHintsHeight.value = height;
  },
  { flush: "sync" },
);

watch(
  [theme, () => props.game],
  () => {
    initializeBoardColors(true);
    scheduleDrawBoard();
    drawHints();
  },
  { flush: "post", deep: true },
);

// Painted tiles in the editor react to hover
watch(hoveredTile, () => {
  if (props.editable) scheduleDrawBoard();
});

watch(solvedHintsKey, drawHints, { flush: "post" });
// Redraw once the frozen height catches up after a stroke
watch(columnHintsHeight, drawHints, { flush: "post" });
// The hint canvases are recreated when unlocking, so they need a fresh draw
watch(() => props.locked, drawHints, { flush: "post" });
</script>

<style scoped>
.picross-layout {
  position: relative;
  width: fit-content;
  transition: margin-top 0.3s ease;
}
.column-hints {
  position: absolute;
  bottom: 100%;
  left: 0;
  display: block;
}
.row-hints {
  position: absolute;
  top: 0;
  right: 100%;
  display: block;
}
.game-board {
  position: relative;
  width: fit-content;
  height: auto;
  box-sizing: border-box;
  border-radius: 8px;
  canvas {
    position: relative;
    display: block;
    border-radius: 12px;
    touch-action: none; /* keep touch drags from scrolling the page */
  }
}
/* The sketch filter lives here so canvas redraws never re-run it */
.board-backdrop {
  position: absolute;
  inset: 0;
  background-color: var(--surface);
  border-radius: 8px;
  filter: url(#picross-sketch) drop-shadow(0 0 6px rgba(0, 0, 0, 0.2));
  pointer-events: none;
}
.hover-tile {
  --hover-tile-color: color-mix(var(--inverted-solid) 40%, var(--solid));
  position: absolute;
  top: -2px;
  left: -2px;
  z-index: 1;
  box-sizing: content-box;
  border: 2px solid var(--hover-tile-color);
  pointer-events: none;
  &.mark::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    background: var(--color);
    width: 30px;
    height: 30px;
    mask-image: url("/images/icons/close.webp");
    mask-size: 30px;
  }
  &.erase {
    --hover-tile-color: var(--red);
    border-style: dashed;
  }
  &.paint {
    --hover-tile-color: var(--paint-color);
  }
}

.metadata {
  margin-top: 12px;
  text-align: center;
}
</style>
