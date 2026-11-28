import type {
  PicrossHints,
  PicrossSolveResult,
} from "@echolotl/picross/solver";
import type { SolverWorkerRequest } from "~/utils/picross/solver.worker";

const DEBOUNCE_MS = 150;
const LONG_RUNNING_MS = 30000;

// This exists so that we can use a worker to solve Picross puzzles off the main thread.
// As a bonus, it also comes with a loading state and stuff
export function usePicrossSolver() {
  const result = ref<PicrossSolveResult | null>(null);
  const solving = ref(false);
  const takingLong = ref(false);

  let worker: Worker | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let longRunningTimer: ReturnType<typeof setTimeout> | undefined;

  function stopWorker() {
    clearTimeout(longRunningTimer);
    takingLong.value = false;
    worker?.terminate();
    worker = null;
  }

  function run(request: SolverWorkerRequest) {
    stopWorker();
    const current = new Worker(
      new URL("../utils/picross/solver.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker = current;
    solving.value = true;
    takingLong.value = false;
    longRunningTimer = setTimeout(() => {
      takingLong.value = true;
    }, LONG_RUNNING_MS);

    current.onmessage = (event: MessageEvent<PicrossSolveResult>) => {
      stopWorker();
      result.value = event.data;
      solving.value = false;
    };
    current.onerror = () => {
      stopWorker();
      result.value = {
        solutionCount: 0,
        logicSolvable: false,
        solution: null,
        unknownCount: 0,
      };
      solving.value = false;
    };

    current.postMessage(request);
  }

  function solve(hints: PicrossHints, size: { width: number; height: number }) {
    clearTimeout(debounceTimer);
    // Hints may be reactive proxies, which can't be posted to a worker
    const request: SolverWorkerRequest = {
      hints: JSON.parse(JSON.stringify(hints)),
      size: { width: size.width, height: size.height },
    };
    solving.value = true;
    debounceTimer = setTimeout(() => run(request), DEBOUNCE_MS);
  }

  function cancel() {
    clearTimeout(debounceTimer);
    stopWorker();
    solving.value = false;
  }

  if (getCurrentScope()) onScopeDispose(cancel);

  return { result, solving, takingLong, solve, cancel };
}
