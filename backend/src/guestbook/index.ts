import Elysia, { t } from "elysia";
import { PathOwnershipError } from "@echolotl/flashish";
import type {
  GuestbookClientMessage,
  GuestbookServerMessage,
} from "@echolotl/types";
import { userBySession } from "../auth/discord/repository";
import { ClientMessage } from "./model";
import {
  SUBSCRIBE,
  SnapshotPersistenceError,
  activeStrokes,
  broadcastDrawingState,
  connections,
  conflictsWithSelection,
  drawing,
  drawingState,
  incrementRevision,
  isDuplicate,
  operationIds,
  strokeKey,
  userCount,
  updateSelection,
} from "./service";

export const guestbookRouter = new Elysia({ prefix: "/guestbook" })
  .guard({
    cookie: t.Cookie({ session: t.Optional(t.String()) }),
  })
  .resolve(({ cookie: { session } }) => ({
    user: userBySession(session?.value),
  }))
  .ws("/ws", {
    body: ClientMessage,
    open(ws) {
      ws.subscribe(SUBSCRIBE);
      connections.set(ws.raw, {
        userId: ws.data.user?.userId ?? null,
        clientIds: new Set(),
        strokeKeys: new Set(),
        selection: null,
      });
      ws.send(JSON.stringify(drawingState()));
      for (const connection of connections.values()) {
        if (connection.selection) ws.send(JSON.stringify(connection.selection));
      }
      ws.publish(SUBSCRIBE, {
        type: "user:enter",
        userId: ws.data.user?.userId ?? null,
        userCount: userCount(),
      } satisfies GuestbookServerMessage);
    },
    message(ws, msg) {
      const user = ws.data.user;
      if (!user) {
        ws.close(1008, "Read-only connection");
        return;
      }

      const message: GuestbookClientMessage = msg;
      const userId = user.userId;
      const connection = connections.get(ws.raw);
      if (!connection) {
        console.error("Missing guestbook connection state");
        ws.close(1011, "Missing connection state");
        return;
      }
      try {
        if ("ids" in message && message.type !== "selection:preview") {
          let affectedIds = message.ids;
          if (message.type === "paths:group" || message.type === "paths:ungroup") {
            const ids = new Set(message.ids);
            const groupIds = new Set(
              drawing.paths.flatMap((path) =>
                ids.has(path.id) && path.groupId ? [path.groupId] : [],
              ),
            );
            if (message.type === "paths:group") groupIds.add(message.groupId);
            affectedIds = drawing.paths
              .filter((path) => ids.has(path.id) || (path.groupId && groupIds.has(path.groupId)))
              .map((path) => path.id);
          }
          if (conflictsWithSelection(connections.values(), connection, affectedIds)) {
            ws.send(JSON.stringify({
              type: "error",
              message: "This drawing is selected by another user.",
            } satisfies GuestbookServerMessage));
            broadcastDrawingState(ws, message);
            return;
          }
        }
        switch (message.type) {
          case "cursor:move":
          case "cursor:leave":
            connection.clientIds.add(message.clientId);
            ws.publish(SUBSCRIBE, {
              ...message,
              userId,
            } satisfies GuestbookServerMessage);
            break;
          case "selection:preview": {
            connection.clientIds.add(message.clientId);
            const selection = updateSelection(
              connections.values(), connection, message, userId, drawing.paths,
            );
            ws.publish(SUBSCRIBE, selection);
            ws.send(JSON.stringify(selection));
            break;
          }
          case "stroke:start": {
            const key = strokeKey(userId, message.clientId, message.strokeId);
            connection.strokeKeys.add(key);
            activeStrokes.set(key, {
              clientId: message.clientId,
              strokeId: message.strokeId,
              segments: [],
              color: message.color,
              layer: message.layer,
            });
            ws.publish(SUBSCRIBE, {
              ...message,
              userId,
            } satisfies GuestbookServerMessage);
            break;
          }
          case "stroke:points": {
            const key = [...connection.strokeKeys].find((item) =>
              item.endsWith(`:${message.strokeId}`),
            );
            const stroke = key ? activeStrokes.get(key) : undefined;
            if (!stroke) break;
            stroke.segments.push(...message.points);
            ws.publish(SUBSCRIBE, {
              ...message,
              userId,
            } satisfies GuestbookServerMessage);
            break;
          }
          case "stroke:commit": {
            const key = [...connection.strokeKeys].find((item) =>
              item.endsWith(`:${message.strokeId}`),
            );
            if (key) connection.strokeKeys.delete(key);
            const stroke = key ? activeStrokes.get(key) : undefined;
            if (key) activeStrokes.delete(key);
            if (message.cancelled) {
              ws.publish(SUBSCRIBE, {
                ...message,
                userId,
              } satisfies GuestbookServerMessage);
              break;
            }
            if (isDuplicate(ws, message)) break;
            const segments = message.segments ?? stroke?.segments ?? [];
            if (segments.length) {
              drawing.addStroke(
                segments,
                message.color !== undefined
                  ? message.color
                  : (stroke?.color ?? null),
                message.layer ?? stroke?.layer ?? 2,
                userId,
              );
              incrementRevision();
              ws.publish(SUBSCRIBE, {
                ...message,
                segments,
                color:
                  message.color !== undefined
                    ? message.color
                    : (stroke?.color ?? null),
                layer: message.layer ?? stroke?.layer ?? 2,
                userId,
              } satisfies GuestbookServerMessage);
              broadcastDrawingState(ws, message);
            }
            break;
          }
          case "fill:commit": {
            if (isDuplicate(ws, message)) break;
            const result = drawing.fillAt(
              message.point,
              message.color,
              message.layer,
              userId,
            );
            if (result === "filled") {
              incrementRevision();
              broadcastDrawingState(ws, message);
            } else {
              ws.send(
                JSON.stringify({
                  type: "fill:result",
                  operationId: message.operationId,
                  result,
                } satisfies GuestbookServerMessage),
              );
            }
            break;
          }
          case "paths:move":
            if (isDuplicate(ws, message)) break;
            drawing.movePaths(message.ids, message.dx, message.dy, userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "paths:finish-move":
            if (isDuplicate(ws, message)) break;
            drawing.mergeMovedPaths(message.ids, userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "paths:layer":
            if (isDuplicate(ws, message)) break;
            drawing.movePathsByLayer(message.ids, message.direction, userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "paths:color":
            if (isDuplicate(ws, message)) break;
            drawing.setPathsColor(
              message.ids,
              message.color,
              undefined,
              userId,
            );
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "paths:delete":
            if (isDuplicate(ws, message)) break;
            drawing.deletePaths(message.ids, userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "paths:merge":
            if (isDuplicate(ws, message)) break;
            if (drawing.mergePaths(message.ids, userId)) {
              incrementRevision();
              broadcastDrawingState(ws, message);
            }
            break;
          case "paths:group":
            if (isDuplicate(ws, message)) break;
            if (drawing.groupPaths(message.ids, message.groupId, userId)) {
              incrementRevision();
              broadcastDrawingState(ws, message);
            }
            break;
          case "paths:ungroup":
            if (isDuplicate(ws, message)) break;
            if (drawing.ungroupPaths(message.ids, userId)) {
              incrementRevision();
              broadcastDrawingState(ws, message);
            }
            break;
          case "paths:lock":
          case "paths:unlock":
            if (isDuplicate(ws, message)) break;
            if (drawing.setPathsLocked(message.ids, message.type === "paths:lock", userId)) {
              incrementRevision();
              broadcastDrawingState(ws, message);
            } else {
              broadcastDrawingState(ws, message);
            }
            break;
          case "drawing:undo":
            if (isDuplicate(ws, message)) break;
            drawing.undo(userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
          case "drawing:redo":
            if (isDuplicate(ws, message)) break;
            drawing.redo(userId);
            incrementRevision();
            broadcastDrawingState(ws, message);
            break;
        }
      } catch (error) {
        if (error instanceof PathOwnershipError) {
          ws.send(JSON.stringify({
            type: "error",
            message: error.message,
          } satisfies GuestbookServerMessage));
          if ("operationId" in message) broadcastDrawingState(ws, message);
          return;
        }
        if (!(error instanceof SnapshotPersistenceError)) throw error;
        console.error(error.message, error.originalError);
        if ("operationId" in message) {
          operationIds.delete(message.operationId);
        }
        if (message.type === "stroke:commit") {
          ws.publish(SUBSCRIBE, {
            ...message,
            cancelled: true,
            userId,
          } satisfies GuestbookServerMessage);
        }
        ws.publish(SUBSCRIBE, JSON.stringify(drawingState()));
        ws.close(1011, "Failed to save drawing");
      }
    },
    close(ws) {
      ws.unsubscribe(SUBSCRIBE);
      const connection = connections.get(ws.raw);
      if (!connection) return;
      connections.delete(ws.raw);
      const strokeIds: string[] = [];
      for (const key of connection.strokeKeys) {
        const stroke = activeStrokes.get(key);
        if (!stroke) continue;
        activeStrokes.delete(key);
        strokeIds.push(stroke.strokeId);
      }
      ws.publish(SUBSCRIBE, {
        type: "user:leave",
        userId: connection.userId,
        userCount: userCount(),
        clientIds: [...connection.clientIds],
        strokeIds,
      } satisfies GuestbookServerMessage);
    },
  });
