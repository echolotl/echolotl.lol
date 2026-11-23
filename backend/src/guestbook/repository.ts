import { z } from "zod";
import type { DrawingPath } from "@echolotl/flashish";
import { db } from "../db";

const pathsSchema = z.array(
  z.object({
    id: z.number().int(),
    ownerId: z.string(),
    color: z.string(),
    layer: z.number().int(),
    groupId: z.string().optional(),
    pathData: z.string(),
    bounds: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  }),
);

const readSnapshot = db.prepare(
  "SELECT version, paths FROM guestbook_snapshot WHERE id = 1",
);
const writeSnapshot = db.prepare(`
  INSERT INTO guestbook_snapshot (id, version, paths) VALUES (1, 1, ?)
  ON CONFLICT(id) DO UPDATE SET version = excluded.version, paths = excluded.paths
`);

export function loadDrawingPaths(): DrawingPath[] {
  const row = readSnapshot.get() as { version: number; paths: string } | null;
  if (!row) return [];
  if (row.version !== 1)
    throw new Error(`Unsupported guestbook snapshot version: ${row.version}`);
  return pathsSchema.parse(JSON.parse(row.paths));
}

export function saveDrawingPaths(paths: DrawingPath[]): void {
  writeSnapshot.run(JSON.stringify(paths));
}
