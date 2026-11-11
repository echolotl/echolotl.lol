import type { PicrossHints, PicrossSolveResult } from "~/utils/picross/solver";
import type { SolverWorkerRequest } from "~/utils/picross/solver.worker";

const DEBOUNCE_MS = 150;
const SEARCH_BUDGET_MS = 2000;
// Line logic isn't covered by the search deadline, so a stuck worker gets killed
const HARD_TIMEOUT_MS = 6000;

const TIMED_OUT: PicrossSolveResult = {
  solutionCount: 0,
  logicSolvable: false,
  solution: null,
  unknownCount: 0,
  timedOut: true,
};

// This exists so that we can use a worker to solve Picross puzzles off the main thread.
// As a bonus, it also comes with a loading state and stuff
export function usePicrossSolver() {
  const result = ref<PicrossSolveResult | null>(null);
  const solving = ref(false);

  let worker: Worker | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;

  function stopWorker() {
    clearTimeout(killTimer);
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

    current.onmessage = (event: MessageEvent<PicrossSolveResult>) => {
      stopWorker();
      result.value = event.data;
      solving.value = false;
    };
    current.onerror = () => {
      stopWorker();
      result.value = TIMED_OUT;
      solving.value = false;
    };
    killTimer = setTimeout(() => {
      stopWorker();
      result.value = TIMED_OUT;
      solving.value = false;
    }, HARD_TIMEOUT_MS);

    current.postMessage(request);
  }

  function solve(hints: PicrossHints, size: { width: number; height: number }) {
    clearTimeout(debounceTimer);
    // Hints may be reactive proxies, which can't be posted to a worker
    const request: SolverWorkerRequest = {
      hints: JSON.parse(JSON.stringify(hints)),
      size: { width: size.width, height: size.height },
      timeoutMs: SEARCH_BUDGET_MS,
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

  return { result, solving, solve, cancel };
}
