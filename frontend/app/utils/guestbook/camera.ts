import type { Ref } from "vue";
import type { Camera } from "~/utils/canvas";
import type { Point } from "@echolotl/types";
import type { GuestbookInputMode } from "~/utils/guestbook/";
import { screenToWorld, updateCameraAt } from "~/utils/canvas/camera";
import { MAX_ZOOM, MIN_ZOOM } from "~/utils/constants";

export class GuestbookCamera {
  constructor(
    private readonly canvas: Ref<HTMLCanvasElement | null>,
    private readonly camera: Camera,
    private readonly canvasSize: { width: number; height: number },
    private readonly inputMode: Ref<GuestbookInputMode>,
    private readonly schedule: () => void,
  ) {}

  getWorldPosition = (event: { clientX: number; clientY: number }) => {
    const element = this.canvas.value;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return screenToWorld(
      {
        x: ((event.clientX - rect.left) * element.clientWidth) / rect.width,
        y: ((event.clientY - rect.top) * element.clientHeight) / rect.height,
      },
      this.camera,
    );
  };

  panCamera = (dx: number, dy: number) => {
    const position = screenToWorld({ x: dx, y: dy }, this.camera);
    this.camera.x = position.x;
    this.camera.y = position.y;
  };

  handleWheel = (event: WheelEvent) => {
    if (!this.canvas.value) return;
    const zoomWithWheel =
      (event.button === 0 && event.ctrlKey) || (event.buttons & 4) !== 0;
    if (!zoomWithWheel && this.inputMode.value !== "pan") return;
    event.preventDefault();
    if (zoomWithWheel) {
      this.zoomFromWheel(event.deltaY, { x: event.clientX, y: event.clientY });
    } else {
      this.panCamera(event.deltaX, event.deltaY);
      this.schedule();
    }
  };

  getCameraAnchor = (center?: Point): Point | null => {
    const element = this.canvas.value;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = center
      ? ((center.x - rect.left) * element.clientWidth) / rect.width
      : element.clientWidth / 2;
    const y = center
      ? ((center.y - rect.top) * element.clientHeight) / rect.height
      : element.clientHeight / 2;
    return { x, y };
  };

  zoomFromWheel = (delta: number, center?: Point) => {
    let target = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, this.camera.zoom * Math.exp(-delta * 0.001)),
    );
    if (
      (this.camera.zoom < 1 && target >= 1) ||
      (this.camera.zoom > 1 && target <= 1)
    ) {
      target = 1;
    }
    this.zoom(target - this.camera.zoom, center);
  };

  zoom = (amount: number, center?: Point) => {
    const anchor = this.getCameraAnchor(center);
    if (!anchor) return;
    const target = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, this.camera.zoom + amount),
    );
    updateCameraAt(this.camera, anchor, { zoom: target });
    this.schedule();
  };

  rotateCamera = (amount: number, center?: Point) => {
    const anchor = this.getCameraAnchor(center);
    if (!anchor) return;
    let rotation = this.camera.rotation + amount;
    if (rotation >= Math.PI || rotation < -Math.PI) {
      rotation =
        ((((rotation + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) -
        Math.PI;
    }
    updateCameraAt(this.camera, anchor, { rotation });
    this.schedule();
  };

  flipCamera = (axis: "horizontal" | "vertical") => {
    const anchor = {
      x: this.canvasSize.width / 2,
      y: this.canvasSize.height / 2,
    };
    updateCameraAt(
      this.camera,
      anchor,
      axis === "horizontal"
        ? { flipX: !this.camera.flipX }
        : { flipY: !this.camera.flipY },
    );
    this.schedule();
  };
}
