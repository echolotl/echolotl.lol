export type PicrossSolution = boolean[][];
export type PicrossSize = { width: number; height: number };
export type PicrossPalette = {
  indices: (number | null)[][];
  colors: string[];
};
export type PicrossMetadata = {
  title?: string;
  author?: { name: string; id?: string };
  source?: { name: string; url?: string | URL };
  created_at: string;
  modified_at: string;
};

export const MIN_BOARD_SIZE = 1;
export const MAX_BOARD_SIZE = 50;
export const MAGIC_HEADER = new Uint8Array([
  0x45, 0x43, 0x48, 0x4f, 0x4c, 0x4f, 0x54, 0x4c,
]);
export const CURRENT_MAJOR_VERSION = 1;
export const CURRENT_MINOR_VERSION = 0;
export const MAX_PALETTE_SIZE = 255;
export const MAX_COLOR_BYTES = 255;
export const FILE_EXTENSION = "epcp";

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

export function getLineHints(line: boolean[]): number[] {
  const runs: number[] = [];
  let length = 0;
  for (const filled of line) {
    if (filled) length++;
    else if (length) {
      runs.push(length);
      length = 0;
    }
  }
  if (length) runs.push(length);
  return runs.length ? runs : [0];
}

export function getHints(solution: PicrossSolution) {
  return {
    rows: solution.map(getLineHints),
    columns:
      solution[0]?.map((_, x) =>
        getLineHints(solution.map((row) => row[x] ?? false)),
      ) ?? [],
  };
}
