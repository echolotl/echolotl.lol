import { solvePicross, type PicrossHints } from "./solver";

export type SolverWorkerRequest = {
  hints: PicrossHints;
  size: { width: number; height: number };
  timeoutMs: number;
};

self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const { hints, size, timeoutMs } = event.data;
  const result = solvePicross(hints, size, undefined, {
    deadline: Date.now() + timeoutMs,
  });
  self.postMessage(result);
};
