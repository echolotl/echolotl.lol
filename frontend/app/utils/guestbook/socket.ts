import type { BrushSegment } from "@echolotl/flashish";
import type { GuestbookClientMessage, Point } from "@echolotl/types";

const { isLoggedIn } = useAuth();

export type GuestbookEditPayload =
  | {
      type: "stroke:commit";
      strokeId: string;
      cancelled?: boolean;
      segments?: BrushSegment[];
      color?: string | null;
      layer?: number;
    }
  | { type: "paths:move"; ids: number[]; dx: number; dy: number }
  | { type: "paths:finish-move"; ids: number[] }
  | { type: "paths:layer"; ids: number[]; direction: -1 | 1 }
  | { type: "paths:color"; ids: number[]; color: string }
  | { type: "paths:delete"; ids: number[] }
  | { type: "paths:merge"; ids: number[] }
  | { type: "paths:group"; ids: number[]; groupId: string }
  | { type: "paths:ungroup"; ids: number[] }
  | { type: "paths:lock" | "paths:unlock"; ids: number[] }
  | { type: "fill:commit"; point: Point; color: string; layer: number }
  | { type: "drawing:undo" | "drawing:redo" };

interface GuestbookSocketOptions {
  backendUrl: string;
  enabled: boolean;
  onOpen: () => void;
  onMessage: (event: MessageEvent) => void;
  onClose: () => void;
}

export class GuestbookSocket {
  private socket: WebSocket | null = null;
  private currentClientId: string | null = null;
  private pendingMessages: GuestbookClientMessage[] = [];

  constructor(private readonly options: GuestbookSocketOptions) {}

  connect() {
    let disposed = false;
    let retryDelay = 500;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let connection: WebSocket | null = null;

    const open = () => {
      if (disposed || !this.options.enabled || !this.options.backendUrl) return;
      const url = new URL(
        `${this.options.backendUrl.replace(/\/+$/, "")}/guestbook/ws`,
        window.location.origin,
      );
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      connection = new WebSocket(url);
      this.socket = connection;
      this.currentClientId ??= crypto.randomUUID();
      const currentSocket = connection;
      currentSocket.addEventListener("open", () => {
        if (this.socket !== currentSocket) return;
        retryDelay = 500;
        for (const message of this.pendingMessages.splice(0)) {
          currentSocket.send(JSON.stringify(message));
        }
        this.options.onOpen();
      });
      currentSocket.addEventListener("message", (event) => {
        if (this.socket === currentSocket) this.options.onMessage(event);
      });
      currentSocket.addEventListener("error", (event) => {
        console.error("Guestbook WebSocket error:", event);
      });
      currentSocket.addEventListener("close", () => {
        if (this.socket !== currentSocket || disposed) return;
        this.socket = null;
        this.options.onClose();
        retryTimer = setTimeout(open, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15_000);
      });
    };

    open();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      connection?.close();
      if (this.socket === connection) this.socket = null;
      this.currentClientId = null;
      this.pendingMessages = [];
    };
  }

  send = (message: GuestbookClientMessage) => {
    if (!isLoggedIn.value) return;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else if (
      message.type !== "cursor:move" &&
      message.type !== "cursor:leave" &&
      message.type !== "selection:preview"
    ) {
      this.pendingMessages.push(message);
    }
  };

  sendEdit = (message: GuestbookEditPayload) => {
    const clientId = this.currentClientId;
    if (!clientId) return;
    const operationId =
      message.type === "stroke:commit" ? message.strokeId : crypto.randomUUID();
    this.send({ ...message, clientId, operationId });
    return operationId;
  };

  get clientId() {
    return this.currentClientId;
  }

  get isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  close() {
    this.socket?.close();
    this.socket = null;
    this.currentClientId = null;
  }
}
