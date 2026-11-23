import { FlashishDrawing, type BrushSegment } from "@echolotl/flashish";
import type {
  GuestbookDrawingStateMessage,
  GuestbookSelectionPreviewMessage,
  GuestbookServerSelectionPreviewMessage,
} from "@echolotl/types";
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
    strokeId: string;
    segments: BrushSegment[];
    color: string | null;
    layer: number;
  }
>();
export const connections = new Map<object, GuestbookConnection>();
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

export function userCount(): number {
  const users = new Set<string>();
  let visitors = 0;
  for (const connection of connections.values()) {
    if (connection.userId === null) visitors++;
    else users.add(connection.userId);
  }
  return users.size + visitors;
}

export function drawingState(): GuestbookDrawingStateMessage {
  return {
    type: "drawing:state",
    epoch,
    revision,
    userCount: userCount(),
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
  userId: string | null;
  clientIds: Set<string>;
  strokeKeys: Set<string>;
  selection: GuestbookServerSelectionPreviewMessage | null;
};

type SelectionConnection = Pick<GuestbookConnection, "selection">;

export function updateSelection(
  connections: Iterable<SelectionConnection>,
  connection: SelectionConnection,
  message: GuestbookSelectionPreviewMessage,
  userId: string,
  paths: { id: number; ownerId: string | null }[],
): GuestbookServerSelectionPreviewMessage {
  const unavailable = new Set<number>();
  for (const other of connections) {
    if (other !== connection) {
      for (const id of other.selection?.ids ?? []) unavailable.add(id);
    }
  }
  const selectable = new Set(
    paths
      .filter((path) => path.ownerId === null || path.ownerId === userId)
      .map((path) => path.id),
  );
  const selection = {
    ...message,
    ids: [...new Set(message.ids)].filter(
      (id) => selectable.has(id) && !unavailable.has(id),
    ),
    userId,
  };
  connection.selection = selection;
  return selection;
}

export function conflictsWithSelection(
  connections: Iterable<SelectionConnection>,
  connection: SelectionConnection,
  ids: number[],
): boolean {
  const affected = new Set(ids);
  for (const other of connections) {
    if (
      other !== connection &&
      other.selection?.ids.some((id) => affected.has(id))
    ) return true;
  }
  return false;
}
