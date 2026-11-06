<template>
  <PicrossPage subtitle="Free Play" accent="var(--primary)">
    <PicrossGrid v-if="game" ref="grid" :game="game" />
    <p v-else class="lotl-font loading" role="status">
      <Icon icon="loading" width="20px" height="20px" />
      Loading puzzle...
    </p>
    <p v-if="game?.isCompleted" class="solved-message" role="status">
      <Icon icon="crown" width="20px" height="20px" />
      {{
        WIN_SPLASH_TEXTS[Math.floor(Math.random() * WIN_SPLASH_TEXTS.length)]
      }}
    </p>
    <div class="game-actions">
      <PicrossInputControls :grid="grid" />
      <button @click="handleClear" class="round">
        <Icon icon="trash" width="20px" height="20px" />
        Clear
      </button>
      <button
        :disabled="game?.isCompleted"
        @click="solveGame(game!)"
        class="round filled"
      >
        Solve
      </button>
      <button
        :disabled="game?.isCompleted"
        @click="() => fillRandomTile(game!)"
        class="round"
      >
        <Icon icon="tip" width="20px" height="20px" />
        Hint
      </button>
    </div>
    <div class="game-actions">
      <PicrossSizeInput v-model="sizeInput" />
      <button @click="regeneratePuzzle" class="round filled">Regenerate</button>
      <button @click="fileInput?.click()" class="round">
        <Icon icon="upload" width="20px" height="20px" />
        Load
      </button>
      <input
        ref="fileInput"
        type="file"
        :accept="`.${FILE_EXTENSION}`"
        hidden
        @change="handleLoad"
      />
    </div>
    <p v-if="fileError" class="file-error" role="alert">{{ fileError }}</p>
  </PicrossPage>
</template>

<script setup lang="ts">
import {
  createPicrossGame,
  clearBoard,
  clampPicrossSize,
  solveGame,
  fillRandomTile,
  type PicrossSize,
} from "~/utils/picross";
import PicrossGrid from "~/components/picross/PicrossGrid.vue";
import PicrossSizeInput from "~/components/picross/PicrossSizeInput.vue";
import Icon from "~/components/ui/Icon.vue";
import PicrossPage from "~/components/picross/PicrossPage.vue";
import PicrossInputControls from "~/components/picross/PicrossInputControls.vue";
import { getHints } from "~/utils/picross";
import { generateSolvableSolution } from "~/utils/picross/solver";
import type { PicrossGame } from "~/utils/picross";
import { loadPicrossPuzzle } from "~/utils/picross/file";

const fileInput = ref<HTMLInputElement | null>(null);
const fileError = ref("");
const sizeInput = ref<PicrossSize>({
  width: DEFAULT_BOARD_SIZE,
  height: DEFAULT_BOARD_SIZE,
});
const game = ref<PicrossGame | null>(null);
const grid = ref<InstanceType<typeof PicrossGrid> | null>(null);

const WIN_SPLASH_TEXTS = [
  "In the future, all picross will be randomly generated!",
  "You're telling me a pih crossed this puzzle?",
  "Good job! Please don't report copyright infringement to Nintendo",
  "Nautilus looooooves finished picross puzzles",
  "How puzzling... my picross",
  "Thanks, I didn't want to solve it myself...",
  "Yummy yummy in Nautilus tummy",
  "It's colorful which means you solved it",
];

definePageMeta({
  pageTransition: false,
  viewTransition: true,
});

function handleClear() {
  if (!game.value) return;
  clearBoard(game.value);
  grid.value?.clearHistory();
}

// Builds a fresh puzzle using the size from the inputs
function regeneratePuzzle() {
  const size = clampPicrossSize(sizeInput.value);
  sizeInput.value = size;
  const solution = generateSolvableSolution(size, getHints);
  game.value = createPicrossGame(size, solution);

  // solution tiles get random bright colors, everything else gets the darker 4th color
  game.value.palette.colors = Array.from({ length: 4 }, (_, i) =>
    rgbToHex(randomColor(0.5, i === 3 ? 0.25 : 0.5)),
  );
  game.value.palette.indices = solution.map((row) =>
    row.map((filled) => (filled ? Math.floor(Math.random() * 3) : 3)),
  );
}

async function handleLoad(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Clearing the value lets the same file be picked again
  input.value = "";
  if (!file) return;
  fileError.value = "";
  try {
    const puzzle = loadPicrossPuzzle(new Uint8Array(await file.arrayBuffer()));
    const next = createPicrossGame(puzzle.size, puzzle.solution);
    next.palette = puzzle.palette;
    next.metadata = puzzle.metadata;
    game.value = next;
    sizeInput.value = puzzle.size;
    grid.value?.clearHistory();
  } catch (error) {
    fileError.value =
      error instanceof Error ? error.message : "Couldn't load that file";
  }
}

onMounted(regeneratePuzzle);

useSeoMeta({
  title: "echolotl - Nautilus' Picross (Free Play)",
  description: "Play an unlimited number of Nautilus' picross puzzles.",
  ogDescription: "Play an unlimited number of Nautilus' picross puzzles.",
  ogTitle: "Nautilus' Picross (Free Play)",
  ogUrl: "https://echolotl.lol/picross",
});
</script>

<style scoped>
.file-error {
  color: var(--red);
}
.solved-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: var(--orange);
}
</style>
