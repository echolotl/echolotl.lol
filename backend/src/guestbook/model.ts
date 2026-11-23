import { t } from "elysia";

export const Point = t.Object({
  x: t.Number(),
  y: t.Number(),
});

const CursorMoveMessage = t.Object({
  type: t.Literal("cursor:move"),
  clientId: t.String(),
  point: Point,
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
  clientId: t.String(),
  operationId: t.String(),
  strokeId: t.String(),
  cancelled: t.Optional(t.Boolean()),
  segments: t.Optional(t.Array(StrokeSegment)),
  color: t.Optional(t.Union([t.String(), t.Null()])),
  layer: t.Optional(t.Number()),
});

const PathIds = t.Array(t.Number());
const EditMetadata = {
  clientId: t.String(),
  operationId: t.String(),
};

export const ClientMessage = t.Union([
  CursorMoveMessage,
  CursorLeaveMessage,
  t.Object({
    type: t.Literal("selection:preview"),
    clientId: t.String(),
    ids: t.Array(t.Number()),
    offset: Point,
    marquee: t.Union([t.Object({ from: Point, to: Point }), t.Null()]),
  }),
  StrokeStartMessage,
  StrokePointsMessage,
  StrokeCommitMessage,
  t.Object({
    ...EditMetadata,
    type: t.Literal("fill:commit"),
    point: Point,
    color: t.String(),
    layer: t.Integer({ minimum: 1, maximum: 3 }),
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:move"),
    ids: PathIds,
    dx: t.Number(),
    dy: t.Number(),
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:finish-move"),
    ids: PathIds,
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:layer"),
    ids: PathIds,
    direction: t.Union([t.Literal(-1), t.Literal(1)]),
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:color"),
    ids: PathIds,
    color: t.String(),
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:delete"),
    ids: PathIds,
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:merge"),
    ids: PathIds,
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:group"),
    ids: PathIds,
    groupId: t.String({ minLength: 1 }),
  }),
  t.Object({
    ...EditMetadata,
    type: t.Literal("paths:ungroup"),
    ids: PathIds,
  }),
  t.Object({
    ...EditMetadata,
    type: t.Union([t.Literal("drawing:undo"), t.Literal("drawing:redo")]),
  }),
]);
