import type { Status } from "./model";
import { getLatestStatus, insertStatus, getStatusesLimit } from "../db";
import { sendDiscordWebhook } from "../util/webhook";

export function getStatus(): Status | null {
  return getLatestStatus();
}

export function setStatus(status: Omit<Status, "id" | "createdAt">): void {
  var createdStatus = insertStatus(status);
  sendDiscordWebhook({
    content: "",
    embeds: [
      {
        title: "echolotl has updated their status!",
        description: `${status.emoji ? `${status.emoji} ` : ""}${status.text}`,
        timestamp: new Date(createdStatus.createdAt).toISOString(),
        color: 0xf53eb8,
      },
    ],
  });
}

export function getStatuses(limit: number, cursor?: number): Status[] {
  return getStatusesLimit(limit, cursor);
}
