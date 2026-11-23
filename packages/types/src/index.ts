export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  anonymous: boolean;
  shouldSync: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PublicUser {
  id: string | null;
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
}

export interface CommentNode {
  id: number;
  slug: string;
  parentId: number | null;
  body: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  author: PublicUser | null;
  replyCount: number;
}

export interface Status {
  id: number;
  text: string;
  emoji: string | null;
  createdAt: number;
}

export interface SpotifyResponse {
  playing: boolean;
  title: string;
  href: string;
  durationMs: number;
  progressMs: number;
  artists: {
    name: string;
    href: string;
  }[];
  album: {
    name: string;
    href: string;
    imageUrl: string | null;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface GuestbookCursorMoveMessage {
  type: "cursor:move";
  clientId: string;
  point: Point;
  mode: GuestbookCursorMode;
  brushSize: number;
}

export type GuestbookCursorMode = "brush" | "pointer";

export interface GuestbookCursorLeaveMessage {
  type: "cursor:leave";
  clientId: string;
}

export interface GuestbookSelectionPreviewMessage {
  type: "selection:preview";
  clientId: string;
  sequence: number;
  ids: number[];
  offset: Point;
  marquee: { from: Point; to: Point } | null;
}

export interface GuestbookServerSelectionPreviewMessage
  extends GuestbookSelectionPreviewMessage {
  userId: string;
}

export interface GuestbookUserEnterMessage {
  type: "user:enter";
  userId: string | null;
  userCount: number;
}

export interface GuestbookUserLeaveMessage {
  type: "user:leave";
  userId: string | null;
  userCount: number;
  clientIds: string[];
  strokeIds: string[];
}

export interface GuestbookSelectionRequestMessage {
  type: "selection:request";
}

export interface GuestbookStrokeSegment {
  from: Point;
  to: Point;
  size: number;
}

export interface GuestbookStrokeStartMessage {
  type: "stroke:start";
  clientId: string;
  strokeId: string;
  color: string | null;
  layer: number;
}

export interface GuestbookStrokePointsMessage {
  type: "stroke:points";
  strokeId: string;
  points: GuestbookStrokeSegment[];
}

export interface GuestbookStrokeCommitMessage {
  type: "stroke:commit";
  clientId: string;
  operationId: string;
  strokeId: string;
  cancelled?: boolean;
  segments?: GuestbookStrokeSegment[];
  color?: string | null;
  layer?: number;
}

export interface GuestbookEditMetadata {
  clientId: string;
  operationId: string;
}

export interface GuestbookFillMessage extends GuestbookEditMetadata {
  type: "fill:commit";
  point: Point;
  color: string;
  layer: number;
}

export interface GuestbookFillResultMessage {
  type: "fill:result";
  operationId: string;
  result: "unbounded" | "unchanged";
}

export interface GuestbookPathsMoveMessage extends GuestbookEditMetadata {
  type: "paths:move";
  ids: number[];
  dx: number;
  dy: number;
}

export interface GuestbookPathsFinishMoveMessage extends GuestbookEditMetadata {
  type: "paths:finish-move";
  ids: number[];
}

export interface GuestbookPathsLayerMessage extends GuestbookEditMetadata {
  type: "paths:layer";
  ids: number[];
  direction: -1 | 1;
}

export interface GuestbookPathsColorMessage extends GuestbookEditMetadata {
  type: "paths:color";
  ids: number[];
  color: string;
}

export interface GuestbookPathsDeleteMessage extends GuestbookEditMetadata {
  type: "paths:delete";
  ids: number[];
}

export interface GuestbookPathsMergeMessage extends GuestbookEditMetadata {
  type: "paths:merge";
  ids: number[];
}

export interface GuestbookPathsGroupMessage extends GuestbookEditMetadata {
  type: "paths:group";
  ids: number[];
  groupId: string;
}

export interface GuestbookPathsUngroupMessage extends GuestbookEditMetadata {
  type: "paths:ungroup";
  ids: number[];
}

export interface GuestbookPathsOwnershipMessage extends GuestbookEditMetadata {
  type: "paths:lock" | "paths:unlock";
  ids: number[];
}

export interface GuestbookErrorMessage {
  type: "error";
  message: string;
}

export interface GuestbookDrawingUndoMessage extends GuestbookEditMetadata {
  type: "drawing:undo" | "drawing:redo";
}

export interface GuestbookServerStrokeStartMessage extends GuestbookStrokeStartMessage {
  userId: string;
}

export interface GuestbookServerStrokePointsMessage extends GuestbookStrokePointsMessage {
  userId: string;
}

export interface GuestbookServerStrokeCommitMessage
  extends GuestbookStrokeCommitMessage {
  userId: string;
}

export interface GuestbookDrawingPath {
  id: number;
  ownerId: string | null;
  color: string;
  layer: number;
  groupId?: string;
  pathData: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface GuestbookDrawingStateMessage {
  type: "drawing:state";
  epoch: string;
  revision: number;
  userCount: number;
  paths: GuestbookDrawingPath[];
  undoUserIds: string[];
  redoUserIds: string[];
  operation?: { clientId: string; operationId: string; type: string };
}

export type GuestbookStrokeMessage =
  | GuestbookStrokeStartMessage
  | GuestbookStrokePointsMessage
  | GuestbookStrokeCommitMessage;

export type GuestbookServerStrokeMessage =
  | GuestbookServerStrokeStartMessage
  | GuestbookServerStrokePointsMessage
  | GuestbookServerStrokeCommitMessage;

export interface GuestbookServerCursorMoveMessage extends GuestbookCursorMoveMessage {
  userId: string;
}

export interface GuestbookServerCursorLeaveMessage extends GuestbookCursorLeaveMessage {
  userId: string;
}

export type GuestbookClientMessage =
  | GuestbookCursorMoveMessage
  | GuestbookCursorLeaveMessage
  | GuestbookSelectionPreviewMessage
  | GuestbookStrokeMessage
  | GuestbookFillMessage
  | GuestbookPathsMoveMessage
  | GuestbookPathsFinishMoveMessage
  | GuestbookPathsLayerMessage
  | GuestbookPathsColorMessage
  | GuestbookPathsDeleteMessage
  | GuestbookPathsMergeMessage
  | GuestbookPathsGroupMessage
  | GuestbookPathsUngroupMessage
  | GuestbookPathsOwnershipMessage
  | GuestbookDrawingUndoMessage;
export type GuestbookServerMessage =
  | GuestbookServerCursorMoveMessage
  | GuestbookServerCursorLeaveMessage
  | GuestbookServerSelectionPreviewMessage
  | GuestbookUserEnterMessage
  | GuestbookUserLeaveMessage
  | GuestbookSelectionRequestMessage
  | GuestbookServerStrokeMessage
  | GuestbookFillResultMessage
  | GuestbookErrorMessage
  | GuestbookDrawingStateMessage;
