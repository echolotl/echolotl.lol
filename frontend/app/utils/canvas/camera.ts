import type { Camera, Point, Rect } from "./index";

/**
 * Converts a point from screen coordinates to world coordinates based on the camera's state.
 * @param point The point in screen coordinates
 * @param camera The camera object containing position, zoom, and rotation
 * @returns The corresponding point in world coordinates
 */
export function screenToWorld(point: Point, camera: Camera): Point {
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  const flipX = camera.flipX ? -1 : 1;
  const flipY = camera.flipY ? -1 : 1;
  return {
    x:
      camera.x +
      (point.x * flipX * cos + point.y * flipY * sin) / camera.zoom,
    y:
      camera.y +
      (-point.x * flipX * sin + point.y * flipY * cos) / camera.zoom,
  };
}

/**
 * Converts a point from world coordinates to screen coordinates based on the camera's state.
 * @param point The point in world coordinates
 * @param camera The camera object containing position, zoom, and rotation
 * @returns The corresponding point in screen coordinates
 */
export function worldToScreen(point: Point, camera: Camera): Point {
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  const flipX = camera.flipX ? -1 : 1;
  const flipY = camera.flipY ? -1 : 1;
  const x = point.x - camera.x;
  const y = point.y - camera.y;
  return {
    x: (x * cos - y * sin) * camera.zoom * flipX,
    y: (x * sin + y * cos) * camera.zoom * flipY,
  };
}

/**
 * Updates the camera's zoom and/or rotation while keeping a specific anchor point fixed on the screen.
 * @param camera The camera object to update
 * @param anchor The point on the screen to keep fixed
 * @param changes The changes to apply to the camera's zoom and/or rotation
 */
export function updateCameraAt(
  camera: Camera,
  anchor: Point,
  changes: Partial<Pick<Camera, "zoom" | "rotation" | "flipX" | "flipY">>,
) {
  const before = screenToWorld(anchor, camera);
  Object.assign(camera, changes);
  const after = screenToWorld(anchor, camera);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
}

/**
 * Measures the incremental pan, scale and rotation between two touch pairs.
 */
export function measureGesture(previous: [Point, Point], current: [Point, Point]) {
  const previousDx = previous[1].x - previous[0].x;
  const previousDy = previous[1].y - previous[0].y;
  const currentDx = current[1].x - current[0].x;
  const currentDy = current[1].y - current[0].y;
  const previousDistance = Math.hypot(previousDx, previousDy);
  const currentDistance = Math.hypot(currentDx, currentDy);
  const angle = Math.atan2(currentDy, currentDx) - Math.atan2(previousDy, previousDx);
  return {
    pan: {
      x: (current[0].x + current[1].x - previous[0].x - previous[1].x) / 2,
      y: (current[0].y + current[1].y - previous[0].y - previous[1].y) / 2,
    },
    scale: previousDistance ? currentDistance / previousDistance : 1,
    rotation: previousDistance && currentDistance
      ? Math.atan2(Math.sin(angle), Math.cos(angle))
      : 0,
  };
}

/**
 * Calculates the viewport of the camera in world coordinates.
 * @param camera The camera object
 * @param width The width of the screen
 * @param height The height of the screen
 * @returns The rectangle representing the camera's viewport in world coordinates
 */
export function cameraViewport(
  camera: Camera,
  width: number,
  height: number,
): Rect {
  const corners = [
    screenToWorld({ x: 0, y: 0 }, camera),
    screenToWorld({ x: width, y: 0 }, camera),
    screenToWorld({ x: 0, y: height }, camera),
    screenToWorld({ x: width, y: height }, camera),
  ];
  const left = Math.min(...corners.map((point) => point.x));
  const right = Math.max(...corners.map((point) => point.x));
  const top = Math.min(...corners.map((point) => point.y));
  const bottom = Math.max(...corners.map((point) => point.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
