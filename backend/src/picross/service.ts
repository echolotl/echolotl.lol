import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { loadPicrossPuzzle } from "@echolotl/picross/file";

const MAX_FILE_BYTES = 1024 * 1024;
const GENERATION_TIMEOUT_MS = 15_000;
const pending = new Map<string, Promise<Uint8Array>>();
let generating = false;

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function readPuzzle(path: string): Promise<Uint8Array | null> {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_FILE_BYTES) {
      throw new Error("Puzzle file is not a regular file or is too large");
    }
    const bytes = await readFile(path);
    loadPicrossPuzzle(bytes);
    return bytes;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function generatePuzzle(): Promise<Uint8Array> {
  if (generating) return Promise.reject(new Error("Puzzle generator is busy"));
  generating = true;
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./generator.worker.ts", import.meta.url));
    const timer = setTimeout(() => finish(new Error("Puzzle generation timed out")), GENERATION_TIMEOUT_MS);
    function finish(error?: Error, bytes?: Uint8Array) {
      clearTimeout(timer);
      worker.terminate();
      generating = false;
      if (error) reject(error);
      else if (bytes) resolve(bytes);
      else reject(new Error("Puzzle generator returned no data"));
    }
    worker.onmessage = (event: MessageEvent<{ bytes?: Uint8Array; error?: string }>) =>
      finish(event.data.error ? new Error(event.data.error) : undefined, event.data.bytes);
    worker.onerror = (event) => finish(new Error(event.message));
    worker.postMessage(null);
  });
}

async function createOrRead(path: string): Promise<Uint8Array> {
  const existing = await readPuzzle(path);
  if (existing) return existing;

  const dateFile = path.split(/[\\/]/).pop();
  if (!dateFile) throw new Error("Invalid puzzle path");
  const curatedDirectory = process.env.PICROSS_CURATED_DIR ?? "./puzzles";
  const curated = await readPuzzle(join(curatedDirectory, dateFile));
  const bytes = curated ?? await generatePuzzle();
  loadPicrossPuzzle(bytes);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, "wx");
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      await link(temporary, path);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
        throw error;
      }
    }
    const published = await readPuzzle(path);
    if (!published) throw new Error("Published puzzle disappeared");
    return published;
  } finally {
    try {
      await unlink(temporary);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
}

export async function getDailyPuzzle(date: string): Promise<Uint8Array> {
  const directory = process.env.PICROSS_DIR ?? "./data/picross";
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${date}.epcp`);
  const existing = await readPuzzle(path);
  if (existing) return existing;
  let task = pending.get(path);
  if (!task) {
    task = createOrRead(path);
    pending.set(path, task);
    void task.then(
      () => pending.delete(path),
      () => pending.delete(path),
    );
  }
  return task;
}
