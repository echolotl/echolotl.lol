import type { Point } from "@echolotl/types";

/**
 * Represents the camera's state.
 */
export interface Camera extends Point {
  zoom: number;
  rotation: number; // in radians
  flipX: boolean;
  flipY: boolean;
}

/**
 * Represents a rectangle in 2D space.
 */
export interface Rect extends Point {
  width: number;
  height: number;
}

export type BaseInputModeDefinition = {
  icon: string;
  keys: KeyboardEvent["code"][];
};
