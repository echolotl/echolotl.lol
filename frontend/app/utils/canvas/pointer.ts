import type { Point } from "@echolotl/types";
import { measureGesture } from "./camera";

type ClientPosition = { clientX: number; clientY: number };

type TrackedPointer = {
  id: number;
  type: string;
  position: Point;
  buttons: number;
  pressure: number;
};

export class CanvasPointer {
  private readonly pointers = new Map<number, TrackedPointer>();

  constructor(private readonly getCanvas: () => HTMLCanvasElement | null) {}

  normalizedPosition(position: ClientPosition): Point | null {
    const canvas = this.getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: (position.clientX - rect.left) / rect.width,
      y: (position.clientY - rect.top) / rect.height,
    };
  }

  canvasPosition(position: ClientPosition): Point | null {
    const canvas = this.getCanvas();
    const normalized = this.normalizedPosition(position);
    if (!canvas || !normalized) return null;
    return {
      x: normalized.x * canvas.clientWidth,
      y: normalized.y * canvas.clientHeight,
    };
  }

  contains(position: ClientPosition): boolean {
    const point = this.normalizedPosition(position);
    return !!point && point.x >= 0 && point.x < 1 && point.y >= 0 && point.y < 1;
  }

  capture(id: number): boolean {
    const canvas = this.getCanvas();
    if (!canvas) return false;
    canvas.setPointerCapture(id);
    return true;
  }

  release(id: number): void {
    const canvas = this.getCanvas();
    if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  track(event: PointerEvent): void {
    this.pointers.set(event.pointerId, {
      id: event.pointerId,
      type: event.pointerType,
      position: { x: event.clientX, y: event.clientY },
      buttons: event.buttons,
      pressure: event.pressure,
    });
  }

  has(id: number): boolean {
    return this.pointers.has(id);
  }

  untrack(id: number): boolean {
    return this.pointers.delete(id);
  }

  tracked(type?: string): TrackedPointer[] {
    const pointers = [...this.pointers.values()];
    return type ? pointers.filter((pointer) => pointer.type === type) : pointers;
  }

  clear(): void {
    this.pointers.clear();
  }

  samples(event: PointerEvent): PointerEvent[] {
    const coalesced = event.getCoalescedEvents?.();
    return coalesced?.length ? coalesced : [event];
  }

  isPressed(event: PointerEvent, buttons: number): boolean {
    return (event.buttons & buttons) !== 0;
  }

  measureGesture(previous: [Point, Point], current: [Point, Point]) {
    const toCanvas = (point: Point) =>
      this.canvasPosition({ clientX: point.x, clientY: point.y });
    const previousA = toCanvas(previous[0]);
    const previousB = toCanvas(previous[1]);
    const currentA = toCanvas(current[0]);
    const currentB = toCanvas(current[1]);
    if (!previousA || !previousB || !currentA || !currentB) return null;
    return {
      ...measureGesture([previousA, previousB], [currentA, currentB]),
      center: {
        x: (current[0].x + current[1].x) / 2,
        y: (current[0].y + current[1].y) / 2,
      },
    };
  }
}
