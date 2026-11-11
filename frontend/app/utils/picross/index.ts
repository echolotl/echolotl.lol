import { clamp } from "~/utils";
import { MIN_BOARD_SIZE, MAX_BOARD_SIZE } from "~/utils/constants";

/** The state of a single Picross tile. */
export type PicrossTileState = "empty" | "filled" | "marked";
/** A board of Picross tiles, represented as a 2D array of tile states */
export type PicrossBoard = PicrossTileState[][];
/** The solution of a Picross puzzle, represented as a 2D array of booleans */
export type PicrossSolution = boolean[][];
/** A palette of colors for a Picross board. Referenced by tile indices */
export type PicrossPalette = {
  indices: (number | null)[][]; // Per-tile index into `colors`, whatever the tile's solution state; null means no color
  colors: string[];
};

/** Rectangle size, basically */
export type PicrossSize = {
  width: number;
  height: number;
};

/**
 * Metadata for a Picross puzzle.
 */
export type PicrossMetadata = {
  title?: string;
  author?: { name: string; id?: string };
  source?: { name: string; url?: string | URL };
  created_at: string;
  modified_at: string;
};

/** The full state of a Picross game, including the board, palette, solution, hints, and game metadata. */
export type PicrossGame = {
  board: PicrossBoard;
  palette: PicrossPalette;
  solution: PicrossSolution; // The correct solution without any marked tiles
  hints: {
    rows: number[][];
    columns: number[][];
  };
  size: PicrossSize;
  isCompleted: boolean;
  moves: number;
  hintsUsed: number;
  secondsElapsed: number;
  metadata?: PicrossMetadata;
};

/** A single Picross tile, including its state and color. */
export type PicrossTile = {
  state: PicrossTileState;
  color: number | null; // Palette index
};

/**
 * What an input does to a tile; an omitted state or color leaves it as is.
 */
export type PicrossTileChange = {
  state?: PicrossTileState;
  color?: number | null;
};

/**
 * Definition of an input mode for interacting with Picross tiles.
 */
export type InputModeDefinition = {
  icon: string;
  keys: KeyboardEvent["code"][];
  optIn?: true; // Hidden from the controls unless a parent lists it in `addModes`
  resolve: (
    current: PicrossTile,
    button: PointerEvent["button"],
    editor?: boolean,
    paintIndex?: number | null,
  ) => PicrossTileChange;
};

/**
 * Type representing the input modes available for the Picross game.
 */
export type InputMode = keyof typeof INPUT_MODES;

/**
 * Clamps a Picross size to the allowed board size range.
 * @param size The size to clamp.
 * @returns The clamped size.
 */
export function clampPicrossSize(size: PicrossSize): PicrossSize {
  return {
    width: clamp(size.width, MIN_BOARD_SIZE, MAX_BOARD_SIZE),
    height: clamp(size.height, MIN_BOARD_SIZE, MAX_BOARD_SIZE),
  };
}

/**
 * Checks if a given board is valid for the specified size.
 * @param board The board to check.
 * @param size The expected size of the board.
 * @returns True if the board is valid, false otherwise. (the type is narrowed to `PicrossBoard` if true)
 */
export function isValidBoard(
  board: unknown,
  size: PicrossSize,
): board is PicrossBoard {
  return (
    Array.isArray(board) &&
    board.length === size.height &&
    board.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size.width &&
        row.every((tile) => ["empty", "filled", "marked"].includes(tile)),
    )
  );
}

/**
 * Checks if a given solution is valid for the specified size.
 * @param solution The solution to check.
 * @param size The expected size of the solution.
 * @returns True if the solution is valid, false otherwise. (the type is narrowed to `PicrossSolution` if true)
 */
export function isValidSolution(
  solution: unknown,
  size: PicrossSize,
): solution is PicrossSolution {
  return (
    Array.isArray(solution) &&
    solution.length === size.height &&
    solution.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size.width &&
        row.every((tile) => typeof tile === "boolean"),
    )
  );
}

/**
 * Creates a new Picross palette with the specified size and colors.
 * @param size The size of the Picross board.
 * @param colors The colors to use in the palette.
 * @returns A new Picross palette with the specified size and colors.
 */
export function createPalette(
  size: PicrossSize,
  colors: string[] = [],
): PicrossPalette {
  return {
    indices: Array.from({ length: size.height }, () =>
      Array.from({ length: size.width }, () => null),
    ),
    colors,
  };
}

/**
 * Gets the color a palette index points at, or null for the default color.
 * @param palette The Picross palette.
 * @param index The palette index.
 * @returns The color corresponding to the palette index, or null if the index is null or invalid.
 */
export function getPaletteColor(
  palette: PicrossPalette,
  index: number | null | undefined,
): string | null {
  return index == null ? null : (palette.colors[index] ?? null);
}

/**
 * Applies a change to a Picross tile.
 * @param tile The tile to apply the change to.
 * @param change The change to apply.
 * @returns The updated tile with the change applied.
 */
export function applyTileChange(
  tile: PicrossTile,
  change: PicrossTileChange,
): PicrossTile {
  return {
    state: change.state ?? tile.state,
    color: change.color === undefined ? tile.color : change.color,
  };
}

/**
 * Helper function to toggle a Picross tile to a target state.
 * @param current The current state of the Picross tile.
 * @param target The target state to toggle to.
 * @returns The change to apply to the tile to achieve the target state.
 */
export function toggleTo(
  current: PicrossTile,
  target: PicrossTileState,
): PicrossTileChange {
  return { state: current.state === target ? "empty" : target };
}

/**
 * Gets the input modes to display in the controls, considering opt-in and opt-out modes.
 * @param remove The input modes to remove from the controls.
 * @param add The input modes to add to the controls.
 * @returns The list of input modes to display in the controls, with their definitions.
 */
export function getInputModes(
  remove: readonly InputMode[] = [],
  add: readonly InputMode[] = [],
): { mode: InputMode; definition: InputModeDefinition }[] {
  return (Object.keys(INPUT_MODES) as InputMode[])
    .map((mode) => ({ mode, definition: INPUT_MODE_DEFINITIONS[mode] }))
    .filter(
      ({ mode, definition }) =>
        !remove.includes(mode) && (!definition.optIn || add.includes(mode)),
    );
}

/**
 * Gets the input mode corresponding to a given key code.
 * @param code The key code to check.
 * @returns The input mode associated with the key code, or undefined if none match.
 */
export function getInputModeForKey(code: string): InputMode | undefined {
  return getInputModes().find(({ definition }) =>
    definition.keys.includes(code),
  )?.mode;
}

/**
 * Creates a new Picross game with the given size and solution.
 * @param size The size of the Picross board.
 * @param solution The solution for the Picross board.
 * @returns The initialized Picross game.
 */
export function createPicrossGame(
  size: PicrossSize,
  solution: PicrossSolution,
): PicrossGame {
  return {
    board: Array.from({ length: size.height }, () =>
      Array.from({ length: size.width }, () => "empty" as PicrossTileState),
    ),
    palette: createPalette(size),
    solution,
    hints: getHints(solution),
    size,
    isCompleted: false,
    moves: 0,
    hintsUsed: 0,
    secondsElapsed: 0,
  };
}
//#region HINTS UTILS

/**
 * Gets the runs of filled tiles in a line.
 * @param line The line of tiles to check.
 * @returns An array of objects representing the runs, each with a length and start index.
 */
function getLineRuns(
  line: PicrossTileState[],
): { length: number; start: number }[] {
  const runs: { length: number; start: number }[] = [];
  let start = -1;

  line.forEach((tile, index) => {
    if (tile === "filled") {
      if (start === -1) start = index;
    } else if (start !== -1) {
      runs.push({ length: index - start, start });
      start = -1;
    }
  });

  if (start !== -1) runs.push({ length: line.length - start, start });
  return runs;
}

/**
 * Gets the hints for a single line of the solution.
 * @param line The line of the solution to analyze.
 * @returns An array of numbers representing the lengths of filled runs.
 */
export function getLineHints(line: PicrossSolution[number]) {
  const runs = getLineRuns(
    line.map((filled): PicrossTileState => (filled ? "filled" : "empty")),
  ).map((run) => run.length);
  return runs.length > 0 ? runs : [0];
}

/**
 * Gets the hints for the entire solution board based on the filled runs.
 * @param solution The solution board to analyze.
 * @returns An object containing row and column hints.
 */
export function getHints(solution: PicrossSolution) {
  const rows = solution.map((row) => getLineHints(row));
  const columns =
    solution[0]?.map((_, column) =>
      getLineHints(solution.map((row) => row[column] ?? false)),
    ) ?? [];

  return { rows, columns };
}

/**
 * Determines if a line has more filled tiles than the hints allow.
 * @param line The line of tiles to check.
 * @param hints The hints for the line.
 * @returns True if the line is overfilled, false otherwise.
 */
export function isLineOverfilled(line: PicrossTileState[], hints: number[]) {
  const filled = line.filter((tile) => tile === "filled").length;
  return filled > hints.reduce((a, b) => a + b, 0);
}

/**
 * Determines which hints are solved based on the current line state.
 * @param line The line of tiles to check.
 * @param hints The hints for the line.
 * @returns An array of booleans indicating which hints are solved.
 */
export function getSolvedHints(line: PicrossTileState[], hints: number[]) {
  if (hints.length === 1 && hints[0] === 0) {
    return [line.every((tile) => tile === "marked")];
  }

  if (isLineOverfilled(line, hints)) return hints.map(() => false);

  // With multiple hints, a run only counts once it's capped by an edge or an X on both sides
  const capped = (index: number) =>
    index < 0 || index >= line.length || line[index] === "marked";
  const runs = getLineRuns(line).filter(
    (run) =>
      hints.length === 1 ||
      (capped(run.start - 1) && capped(run.start + run.length)),
  );

  const count = hints.length;
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const minStart = (k: number) => sum(hints.slice(0, k)) + k;
  const minTail = (k: number) => sum(hints.slice(k + 1)) + (count - k - 1);

  let agreed: boolean[] | null = null;

  function assign(j: number, previous: number, chosen: number[]) {
    if (j === runs.length) {
      agreed = hints.map(
        (_, i) => chosen.includes(i) && (agreed ? agreed[i]! : true),
      );
      return;
    }

    const run = runs[j]!;
    for (let k = previous + 1; k < count; k++) {
      if (hints[k] !== run.length) continue;
      if (run.start < minStart(k)) continue;
      if (run.start + run.length > line.length - minTail(k)) continue;
      if (j > 0) {
        const prev = runs[j - 1]!;
        const between = hints.slice(previous + 1, k);
        const needed = 1 + sum(between) + between.length;
        if (run.start - (prev.start + prev.length) < needed) continue;
      }
      assign(j + 1, k, [...chosen, k]);
    }
  }

  assign(0, -1, []);
  return agreed ?? hints.map(() => false);
}

//#endregion HINTS UTILS

/**
 * Checks if the board is solved by comparing it to the solution.
 * @param game The Picross game to check.
 * @returns True if the board matches the solution, false otherwise.
 */
export function isBoardSolved({ board, solution }: PicrossGame) {
  for (let y = 0; y < solution.length; y++) {
    const row = solution[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      if ((board[y]?.[x] === "filled") !== (row[x] ?? false)) return false;
    }
  }
  return true;
}

/**
 * Clears the board, resetting all tiles to empty and reinitializing the palette.
 * @param game The Picross game to clear.
 */
export function clearBoard(game: PicrossGame): void {
  for (const row of game.board) row.fill("empty");
  game.palette = createPalette(game.size, game.palette.colors);
  game.isCompleted = false;
}

/**
 * Solves the game by filling the board with the solution.
 * @param game The Picross game to solve.
 */
export function solveGame(game: PicrossGame): void {
  for (let y = 0; y < game.solution.length; y++) {
    const [row, boardRow] = [game.solution[y], game.board[y]];
    if (!row || !boardRow) continue;
    // Fill the board row with the solution.
    for (let x = 0; x < row.length; x++) {
      boardRow[x] = row[x] ? "filled" : "marked";
    }
  }
  game.isCompleted = true;
}

/**
 * Fills a random empty tile with the correct value from the solution.
 * @param game The Picross game to modify.
 * @param random Optional random number generator function.
 * @returns True if a tile was filled, false otherwise.
 */
export function fillRandomTile(
  game: PicrossGame,
  random = Math.random,
): boolean {
  if (game.isCompleted) return false;
  const { board, solution } = game;
  const emptyTiles: { x: number; y: number }[] = [];
  board.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === "empty") emptyTiles.push({ x, y });
    }),
  );
  const randomTile = emptyTiles[Math.floor(random() * emptyTiles.length)];
  const boardRow = randomTile && board[randomTile.y];
  if (!randomTile || !boardRow) return false;
  const correctValue = solution[randomTile.y]?.[randomTile.x];
  boardRow[randomTile.x] = correctValue ? "filled" : "marked";
  game.isCompleted = isBoardSolved(game);
  return true;
}
