import { getHints } from "@echolotl/picross";
import { generateSolvableSolution } from "@echolotl/picross/solver";
import { savePicrossPuzzle } from "@echolotl/picross/file";

self.onmessage = () => {
  try {
    const side = () => 5 + Math.floor(Math.random() * 16);
    const size = { width: side(), height: side() };
    const solution = generateSolvableSolution(
      size,
      getHints,
      300,
      5000,
      Math.random,
      true,
    );
    const now = new Date().toISOString();
    const bytes = savePicrossPuzzle({
      size,
      solution,
      palette: {
        colors: [],
        indices: solution.map((row) => row.map(() => null)),
      },
      metadata: { created_at: now, modified_at: now },
    });
    self.postMessage({ bytes });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
