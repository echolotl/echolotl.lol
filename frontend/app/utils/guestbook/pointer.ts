import { ref } from "vue";
import type { CanvasPointer } from "~/utils/canvas/pointer";

type TouchStart = "ignore" | "single" | "gesture";

export class GuestbookPointer {
  readonly touchGesture = ref(false);

  constructor(private readonly pointer: CanvasPointer) {}

  startTouch(event: PointerEvent, activePointerId: number | null): TouchStart {
    if (activePointerId !== null && !this.pointer.has(activePointerId))
      return "ignore";
    if (!this.pointer.capture(event.pointerId)) return "ignore";
    this.pointer.track(event);
    if (this.pointer.tracked("touch").length >= 2) {
      this.touchGesture.value = true;
      return "gesture";
    }
    return this.touchGesture.value ? "ignore" : "single";
  }

  moveTouch(event: PointerEvent) {
    if (event.pointerType !== "touch" || !this.pointer.has(event.pointerId))
      return null;
    const previous = this.pointer.tracked("touch").map(({ position }) => position);
    this.pointer.track(event);
    if (!this.touchGesture.value || previous.length < 2) return null;
    const current = this.pointer.tracked("touch").map(({ position }) => position);
    if (current.length < 2) return null;
    return this.pointer.measureGesture(
      [previous[0]!, previous[1]!],
      [current[0]!, current[1]!],
    );
  }

  endTouch(event: PointerEvent, activePointerId: number | null): boolean {
    if (event.pointerType !== "touch" || !this.pointer.untrack(event.pointerId))
      return false;
    if (this.touchGesture.value) {
      if (!this.pointer.tracked("touch").length) this.touchGesture.value = false;
      this.pointer.release(event.pointerId);
      return true;
    }
    if (activePointerId !== event.pointerId) {
      this.pointer.release(event.pointerId);
      return true;
    }
    return false;
  }

  segmentSize(
    event: PointerEvent,
    brushSize: number,
    usePenPressure: boolean,
    lastSize?: number,
  ): number {
    if (event.type === "pointerup") return lastSize ?? brushSize;
    return event.pointerType === "pen" &&
      this.pointer.isPressed(event, 33) &&
      usePenPressure
      ? brushSize * Math.max(event.pressure, 0.01)
      : brushSize;
  }

  clear(): void {
    this.pointer.clear();
    this.touchGesture.value = false;
  }
}
