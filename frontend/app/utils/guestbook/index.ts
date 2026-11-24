import { GUESTBOOK_INPUT_MODES } from "../constants";
import type { BrushSegment } from "@echolotl/flashish";
import type { GuestbookCursorMode, Point } from "@echolotl/types";
import type { BaseInputModeDefinition, Rect } from "../canvas";

/**
 * The possible input modes for the guestbook.
 */
export type GuestbookInputMode = keyof typeof GUESTBOOK_INPUT_MODES;

/** The action captured by an active pointer. */
export type GuestbookPointerMode =
  | Exclude<GuestbookInputMode, "select">
  | "move"
  | "marquee";

/** The shared display and keyboard fields for a guestbook input mode. */
export type GuestbookInputModeDefinition = BaseInputModeDefinition;

/** Gets the guestbook input mode associated with a keyboard code. */
export function getGuestbookInputModeForKey(
  code: string,
): GuestbookInputMode | undefined {
  const definitions = GUESTBOOK_INPUT_MODES;
  return (Object.keys(definitions) as GuestbookInputMode[]).find((mode) =>
    definitions[mode].keys.some((key: string) => key === code),
  );
}

/**
 * A path that has been rendered after being processed.
 */
export interface RenderedPath {
  id: number;
  ownerId: string | null;
  groupId?: string;
  path: Path2D;
  color: string;
  layer: number;
  bounds: Rect;
}

export interface OtherCursor {
  userId: string;
  point: Point | null;
  mode: GuestbookCursorMode;
  brushSize: number;
}

export interface OtherStroke {
  layer: number;
  color: string | null;
  segments: (BrushSegment & { path: Path2D })[];
}

export interface SelectionPreview {
  userId: string;
  ids: number[];
  offset: Point;
  marquee: { from: Point; to: Point } | null;
}

export interface PendingMove {
  ids: number[];
  offset: Point;
}
