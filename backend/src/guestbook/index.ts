import Elysia from "elysia";
import { t } from "elysia";
import type {
  GuestbookClientMessage,
  GuestbookServerMessage,
} from "@echolotl/types";
import { userBySession } from "../auth/discord/repository";

const SUBSCRIBE = "guestbook";

const Point = t.Object({
  x: t.Number(),
  y: t.Number(),
});

const CursorMoveMessage = t.Object({
  type: t.Literal("cursor:move"),
  clientId: t.String(),
  point: Point, // in world coordinates
  mode: t.Union([t.Literal("brush"), t.Literal("pointer")]),
  brushSize: t.Number(),
});

const CursorLeaveMessage = t.Object({
  type: t.Literal("cursor:leave"),
  clientId: t.String(),
});

const StrokeSegment = t.Object({
  from: Point,
  to: Point,
  size: t.Number(),
});

const StrokeStartMessage = t.Object({
  type: t.Literal("stroke:start"),
  clientId: t.String(),
  strokeId: t.String(),
  color: t.Union([t.String(), t.Null()]),
  layer: t.Number(),
});

const StrokePointsMessage = t.Object({
  type: t.Literal("stroke:points"),
  strokeId: t.String(),
  points: t.Array(StrokeSegment),
});

const StrokeCommitMessage = t.Object({
  type: t.Literal("stroke:commit"),
  strokeId: t.String(),
  cancelled: t.Optional(t.Boolean()),
});

const ClientMessage = t.Union([
  CursorMoveMessage,
  CursorLeaveMessage,
  StrokeStartMessage,
  StrokePointsMessage,
  StrokeCommitMessage,
]);

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
    },
    message(ws, msg) {
      if (!ws.data.user) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const message: GuestbookClientMessage = msg;
      switch (message.type) {
        case "cursor:move":
          ws.publish(SUBSCRIBE, {
            ...message,
            userId: ws.data.user.userId,
          } satisfies GuestbookServerMessage);
          break;
        case "cursor:leave":
          ws.publish(SUBSCRIBE, {
            type: "cursor:leave",
            clientId: message.clientId,
            userId: ws.data.user.userId,
          } satisfies GuestbookServerMessage);
          break;
        case "stroke:start":
        case "stroke:points":
        case "stroke:commit":
          ws.publish(SUBSCRIBE, {
            ...message,
            userId: ws.data.user.userId,
          } satisfies GuestbookServerMessage);
          break;
      }
    },
    close(ws) {
      ws.unsubscribe(SUBSCRIBE);
    },
  });
