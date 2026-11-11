//#region PICROSS CONSTANTS

import type { InputMode, InputModeDefinition } from "./picross";
import { toggleTo } from "./picross";

/** The size of each tile in the Picross grid, in pixels. */
const TILE_SIZE = 30;
/** The size of the paint dot used when painting over a non-filled tile, in pixels. */
const PAINT_DOT_SIZE = 10;
/** The font size used for the hint numbers, in pixels. */
const HINT_FONT_SIZE = 14;
/** The line height used for the hint numbers, in pixels. */
const HINT_LINE_HEIGHT = 20;
/** The padding below of the column hints, in pixels. */
const COLUMN_HINTS_PADDING = 8;
/** The padding to the right of the row hints, in pixels. */
const ROW_HINTS_PADDING = 16;
/** The gap between row hints, in pixels. */
const ROW_HINT_GAP = 8;
/** The time the colors stay fully visible between pulses, in milliseconds. */
const REVEAL_PAUSE_MS = 8000;
/** The duration of each pulse that reveals the placed tiles underneath, in milliseconds. */
const REVEAL_PULSE_MS = 3000;
/** The maximum number of undo history entries. */
const UNDO_HISTORY_LIMIT = 100;
/** For things that need it, the minimum allowed board size. */
const MIN_BOARD_SIZE = 1;
/** For things that need it, the maximum allowed board size. */
const MAX_BOARD_SIZE = 50;
/** The default board size. */
const DEFAULT_BOARD_SIZE = 10;

/**
 * All input modes available for the Picross game.
 */
const INPUT_MODES = {
  fill: {
    icon: "edit",
    keys: ["KeyB", "Key1"],
    resolve: (current, button, editor) => {
      if (editor) return toggleTo(current, button === 2 ? "empty" : "filled");
      return toggleTo(current, button === 2 ? "marked" : "filled");
    },
  },
  mark: {
    icon: "close",
    keys: ["KeyM", "Key2"],
    resolve: (current, button, editor) => {
      if (editor) return {};
      return toggleTo(current, button === 2 ? "filled" : "marked");
    },
  },
  erase: {
    icon: "trash",
    keys: ["KeyE", "Key3"],
    resolve: (current, button, editor) =>
      editor ? { state: "empty", color: null } : { state: "empty" },
  },
  paint: {
    icon: "palette",
    keys: ["KeyP", "Key4"],
    optIn: true,
    resolve: (current, button, editor, paintIndex) => {
      if (!editor) return {};
      // No paint index means the default tile color
      return { color: button === 2 ? null : (paintIndex ?? null) };
    },
  },
} as const satisfies Record<string, InputModeDefinition>;

/** The default input mode for the Picross game. */
const DEFAULT_INPUT_MODE = Object.keys(INPUT_MODES)[0] as InputMode;

/** The definitions of all input modes for the Picross game. */
const INPUT_MODE_DEFINITIONS: Record<InputMode, InputModeDefinition> =
  INPUT_MODES;

/** The colors used for the Picross board. */
interface BoardColors {
  line: string;
  tile: string;
  stripe: string;
  completed: string;
  text: string;
  solvedHint: string;
  incorrect: string;
}

/**
 * The current board colors, initialized lazily.
 * If you have a problem with my constants file having a mutable object explode
 */
let BOARD_COLORS: BoardColors | undefined;

/** Initialize the board colors based on the current CSS variables. */
export const initializeBoardColors = (force: boolean = false): BoardColors => {
  if (BOARD_COLORS && !force) return BOARD_COLORS;
  const style = window.getComputedStyle(document.documentElement);
  const invertedSolid = style.getPropertyValue("--inverted-solid").trim();
  const solid = style.getPropertyValue("--solid").trim();
  BOARD_COLORS = {
    line: style.getPropertyValue("--distant"),
    tile: style.getPropertyValue("--text"),
    stripe: invertedSolid,
    completed: style.getPropertyValue("--primary"),
    text: style.getPropertyValue("--text"),
    solvedHint: `color-mix(in srgb, ${invertedSolid} 40%, ${solid})`,
    incorrect: style.getPropertyValue("--red"),
  };
  return BOARD_COLORS;
};

/** The magic header for the Picross puzzle file format. Reads as `ECHOLOTL` */
const MAGIC_HEADER = new Uint8Array([
  0x45, 0x43, 0x48, 0x4f, 0x4c, 0x4f, 0x54, 0x4c,
]);
/** The current major version of the Picross puzzle file format. */
const CURRENT_MAJOR_VERSION = 1;
/** The current minor version of the Picross puzzle file format. */
const CURRENT_MINOR_VERSION = 0;
/** The maximum number of colors allowed in a puzzle's palette. */
const MAX_PALETTE_SIZE = 255;
/** The maximum number of bytes allowed for a single color string. */
const MAX_COLOR_BYTES = 255;
/** The file extension for the Picross puzzle files. */
const FILE_EXTENSION = "epcp";

export {
  TILE_SIZE,
  PAINT_DOT_SIZE,
  HINT_FONT_SIZE,
  HINT_LINE_HEIGHT,
  COLUMN_HINTS_PADDING,
  REVEAL_PAUSE_MS,
  ROW_HINTS_PADDING,
  ROW_HINT_GAP,
  UNDO_HISTORY_LIMIT,
  REVEAL_PULSE_MS,
  DEFAULT_INPUT_MODE,
  BOARD_COLORS,
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  DEFAULT_BOARD_SIZE,
  INPUT_MODES,
  INPUT_MODE_DEFINITIONS,
  MAGIC_HEADER,
  CURRENT_MAJOR_VERSION,
  CURRENT_MINOR_VERSION,
  MAX_PALETTE_SIZE,
  MAX_COLOR_BYTES,
  FILE_EXTENSION,
};
//#endregion PICROSS CONSTANTS
