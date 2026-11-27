import type { PicrossGame } from "./index";

export type PicrossGameStats = Omit<PicrossGame, "palette" | "solution"> & {
  gaveUp?: boolean;
  puzzleId: string;
};

export type PicrossSave = {
  version: 2;
  history: Record<string, PicrossGameStats>;
  totalMoves: number;
  totalHintsUsed: number;
  totalWins: number;
  lastPlayed: string | null;
};

export type PicrossSaveCounters = {
  moves: number;
  hints: number;
  win: boolean;
};

const LOCAL_STORAGE_KEY = "picross:stats:v2";
const LEGACY_STORAGE_KEY = "picross:stats:v1";

export function createPicrossSave(): PicrossSave {
  return {
    version: 2,
    history: {},
    totalMoves: 0,
    totalHintsUsed: 0,
    totalWins: 0,
    lastPlayed: null,
  };
}

export function loadPicrossSave(): PicrossSave | undefined {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PicrossSave>;
    if (parsed.version !== 2) throw new Error("Unsupported save version");
    return {
      version: 2,
      history: parsed.history ?? {},
      totalMoves: parsed.totalMoves ?? 0,
      totalHintsUsed: parsed.totalHintsUsed ?? 0,
      totalWins: parsed.totalWins ?? 0,
      lastPlayed: parsed.lastPlayed ?? null,
    };
  } catch (e) {
    console.error("Failed to load save data:", e);
  }
}

function writePicrossSave(save: PicrossSave) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(save));
  } catch (e) {
    console.error("Failed to write save data:", e);
  }
}

export function persistPicrossSave(
  save: PicrossSave,
  current: PicrossGame,
  dateKey: string,
  puzzleId: string,
  gaveUp: boolean,
  counted: PicrossSaveCounters,
) {
  // Totals are only credited with progress made since the last persist.
  save.totalMoves += current.moves - counted.moves;
  counted.moves = current.moves;
  save.totalHintsUsed += current.hintsUsed - counted.hints;
  counted.hints = current.hintsUsed;
  if (current.isCompleted && !gaveUp && !counted.win) {
    save.totalWins++;
    counted.win = true;
  }

  save.lastPlayed = dateKey;
  save.history[dateKey] = {
    puzzleId,
    board: current.board,
    hints: current.hints,
    size: current.size,
    isCompleted: current.isCompleted,
    moves: current.moves,
    hintsUsed: current.hintsUsed,
    secondsElapsed: current.secondsElapsed,
    gaveUp,
  };

  writePicrossSave(save);
}
