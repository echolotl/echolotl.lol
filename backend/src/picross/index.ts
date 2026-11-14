import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { FIRST_GAME_DATE, getDateKey } from "@echolotl/picross/daily";
import { getDailyPuzzle } from "./service";
import { Logger } from "../util/logger";

function validDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key
  );
}

export const picrossRouter = new Elysia({ prefix: "/picross" })
  .use(rateLimit({ duration: 60_000, max: 100, scoping: "scoped" }))
  .get("/:date", async ({ params }) => {
    const now = new Date();
    const today = getDateKey(now);
    const date = params.date === "today" ? today : params.date;
    if (!validDate(date)) {
      return new Response("Invalid puzzle date", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (date < FIRST_GAME_DATE || date > today) {
      return new Response("Puzzle not available", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
    try {
      const bytes = await getDailyPuzzle(date);
      const body = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      return new Response(body, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
          "Access-Control-Expose-Headers": "X-Picross-Date, X-Picross-Now",
          "X-Picross-Date": date,
          "X-Picross-Now": now.toISOString(),
        },
      });
    } catch (error) {
      Logger.error(`Failed to load daily puzzle ${date}: ${error}`);
      return new Response("Puzzle temporarily unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      });
    }
  });
