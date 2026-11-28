import { solvePicross, type PicrossHints } from "@echolotl/picross/solver";

export type SolverWorkerRequest = {
  hints: PicrossHints;
  size: { width: number; height: number };
};

self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const { hints, size } = event.data;
  const result = solvePicross(hints, size);
  self.postMessage(result);
};
