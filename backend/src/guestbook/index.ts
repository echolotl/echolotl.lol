import Elysia, { t } from "elysia";
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
  drawing,
  drawingState,
  incrementRevision,
  isDuplicate,
  operationIds,
  strokeKey,
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
      connections.set(ws.raw, { clientIds: new Set(), strokeKeys: new Set() });
      ws.send(JSON.stringify(drawingState()));
      ws.publish(SUBSCRIBE, {
        type: "selection:request",
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
        switch (message.type) {
          case "cursor:move":
          case "cursor:leave":
          case "selection:preview":
            connection.clientIds.add(message.clientId);
            ws.publish(SUBSCRIBE, {
              ...message,
              userId,
            } satisfies GuestbookServerMessage);
            break;
          case "stroke:start": {
            const key = strokeKey(userId, message.clientId, message.strokeId);
            connection.strokeKeys.add(key);
            activeStrokes.set(key, {
              clientId: message.clientId,
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
      const userId = ws.data.user?.userId;
      if (!userId) return;
      const connection = connections.get(ws.raw);
      if (!connection) return;
      for (const clientId of connection.clientIds) {
        ws.publish(SUBSCRIBE, {
          type: "cursor:leave",
          clientId,
          userId,
        } satisfies GuestbookServerMessage);
        ws.publish(SUBSCRIBE, {
          type: "selection:leave",
          clientId,
          userId,
        } satisfies GuestbookServerMessage);
      }
      for (const key of connection.strokeKeys) {
        const stroke = activeStrokes.get(key);
        if (!stroke) continue;
        activeStrokes.delete(key);
        ws.publish(SUBSCRIBE, {
          type: "stroke:commit",
          clientId: stroke.clientId,
          operationId: crypto.randomUUID(),
          strokeId: key.slice(key.lastIndexOf(":") + 1),
          cancelled: true,
          userId,
        } satisfies GuestbookServerMessage);
      }
    },
  });
