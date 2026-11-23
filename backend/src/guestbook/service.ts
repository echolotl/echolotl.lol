import { FlashishDrawing, type BrushSegment } from "@echolotl/flashish";
import type { GuestbookDrawingStateMessage } from "@echolotl/types";
import { loadDrawingPaths, saveDrawingPaths } from "./repository";

export const SUBSCRIBE = "guestbook";
export const drawing = new FlashishDrawing();
let savedPaths = loadDrawingPaths();
drawing.replaceDrawingPaths(savedPaths);
export const epoch = crypto.randomUUID();
export const operationIds = new Set<string>();
export const activeStrokes = new Map<
  string,
  {
    clientId: string;
    segments: BrushSegment[];
    color: string | null;
    layer: number;
  }
>();
export const connections = new WeakMap<
  object,
  { clientIds: Set<string>; strokeKeys: Set<string> }
>();
export let revision = 0;

export class SnapshotPersistenceError extends Error {
  constructor(readonly originalError: unknown) {
    super("Failed to save guestbook snapshot");
  }
}

export type EditOperation = {
  clientId: string;
  operationId: string;
  type: string;
};

export const strokeKey = (userId: string, clientId: string, strokeId: string) =>
  `${userId}:${clientId}:${strokeId}`;

export function drawingState(): GuestbookDrawingStateMessage {
  return {
    type: "drawing:state",
    epoch,
    revision,
    paths: drawing.paths,
    undoUserIds: drawing.undoOwners(),
    redoUserIds: drawing.redoOwners(),
  };
}

export function incrementRevision(): void {
  const paths = drawing.paths;
  try {
    saveDrawingPaths(paths);
  } catch (error) {
    drawing.replaceDrawingPaths(savedPaths);
    revision++;
    throw new SnapshotPersistenceError(error);
  }
  savedPaths = paths;
  revision++;
}

export function broadcastDrawingState(
  ws: {
    send: (message: string) => unknown;
    publish: (topic: string, message: string) => unknown;
  },
  operation: EditOperation,
) {
  const { clientId, operationId, type } = operation;
  const state = JSON.stringify({
    ...drawingState(),
    operation: { clientId, operationId, type },
  });
  ws.publish(SUBSCRIBE, state);
  ws.send(state);
}

export function isDuplicate(
  ws: { send: (message: string) => void },
  operation: EditOperation,
) {
  const { operationId, clientId, type } = operation;
  if (!operationIds.has(operationId)) {
    operationIds.add(operationId);
    return false;
  }
  ws.send(
    JSON.stringify({
      ...drawingState(),
      operation: { clientId, operationId, type },
    }),
  );
  return true;
}

export type GuestbookConnection = {
  clientIds: Set<string>;
  strokeKeys: Set<string>;
};
