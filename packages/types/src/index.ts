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
  strokeId: string;
  cancelled?: boolean;
}

export interface GuestbookServerStrokeStartMessage extends GuestbookStrokeStartMessage {
  userId: string;
}

export interface GuestbookServerStrokePointsMessage extends GuestbookStrokePointsMessage {
  userId: string;
}

export interface GuestbookServerStrokeCommitMessage extends GuestbookStrokeCommitMessage {
  userId: string;
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
  | GuestbookStrokeMessage;
export type GuestbookServerMessage =
  | GuestbookServerCursorMoveMessage
  | GuestbookServerCursorLeaveMessage
  | GuestbookServerStrokeMessage;
