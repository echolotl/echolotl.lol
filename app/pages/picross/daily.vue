<template>
  <PicrossPage :subtitle="subtitle" :accent="theme ? '#26a4ad' : '#38d9e4'">
    <div v-if="game" class="grid-wrapper">
      <PicrossGrid ref="grid" :game="game" :locked="!started" />
      <div v-if="!started" class="start-overlay">
        <button @click="beginGame" class="round filled">Start</button>
      </div>
    </div>
    <p v-else class="lotl-font loading" role="status">
      <Icon icon="loading" width="20px" height="20px" />
      Loading puzzle...
    </p>
    <p
      v-if="game"
      class="daily-info text-secondary lotl-font"
      :style="{ color: game.isCompleted ? 'var(--primary)' : undefined }"
    >
      <span v-if="game.isCompleted && !gaveUp">
        <Icon
          icon="crown"
          width="16px"
          height="16px"
          :style="{ color: 'var(--orange)' }"
        ></Icon>
      </span>
      <span>
        <Icon icon="time" width="16px" height="16px" />
        <SlotText :text="timeDisplay" :options="{ skipUnchanged: true }" />
      </span>
      <span>
        <Icon icon="moves" width="16px" height="16px" />
        <SlotText
          :text="String(game?.moves ?? 0)"
          :options="{ skipUnchanged: true }"
        />
      </span>
      <span>
        <Icon icon="tip" width="16px" height="16px" />
        <SlotText
          :text="String(game?.hintsUsed ?? 0)"
          :options="{ skipUnchanged: true }"
        />
      </span>
      <span>
        <Icon icon="size" width="16px" height="16px" />
        {{ game?.size.width ?? 0 }}x{{ game?.size.height ?? 0 }}
      </span>
    </p>
    <div v-if="game?.isCompleted" class="game-actions">
      <button @click="copyWin" class="round filled">
        <Icon icon="copy" width="16px" height="16px" />
        Copy Result
      </button>
    </div>
    <p v-if="game?.isCompleted" class="time-till-next-game text-secondary">
      Next game in:
      <b>
        <SlotText
          :text="`${timeTillNextGameDisplay}`"
          :options="{ skipUnchanged: true }"
        />
      </b>
    </p>
    <div v-if="game && started && !game.isCompleted" class="game-actions">
      <PicrossInputControls
        :grid="grid"
        :disabled="!game || game.isCompleted"
      />
      <button @click="game && clearBoard(game)" class="round">
        <Icon icon="trash" width="20px" height="20px" />
        Clear
      </button>
      <button @click="giveUp" class="round filled red">Give Up</button>
      <button @click="useHint" class="round">
        <Icon icon="tip" width="20px" height="20px" />
        Hint
      </button>
    </div>
    <p
      class="text-secondary"
      style="display: flex; align-items: center; gap: 2px"
    >
      <Icon icon="info" />
      Right now, every puzzle is generated randomly <b>on your device</b>. I'm
      currently working on making it so that each day has a custom-made puzzle,
      so it actually makes a fun picture!
    </p>
  </PicrossPage>
</template>

<script setup lang="ts">
import PicrossPage from "~/components/picross/PicrossPage.vue";
import PicrossInputControls from "~/components/picross/PicrossInputControls.vue";
import PicrossGrid from "~/components/picross/PicrossGrid.vue";
import Icon from "~/components/ui/Icon.vue";
import { SlotText } from "slot-text/vue";
import "slot-text/style.css";
import {
  createPicrossGame,
  getHints,
  type PicrossBoard,
  type PicrossGame,
  fillRandomTile,
  isBoardSolved,
  clearBoard,
  solveGame,
  type PicrossSize,
  isValidBoard,
} from "~/utils/picross";
import {
  getSecondsUntilNextDay,
  daysBetweenDateKeys,
  getDateKey,
  mulberry32,
} from "~/utils/picross/daily";
import { generateSolvableSolution } from "~/utils/picross/solver";

const { theme } = useTheme();

definePageMeta({
  pageTransition: false,
  viewTransition: true,
});

type PicrossGameStats = Omit<PicrossGame, "palette" | "solution"> & {
  gaveUp?: boolean;
};

type PicrossSave = {
  history: Record<string, PicrossGameStats>; // Keyed by date
  totalMoves: number;
  totalHintsUsed: number;
  totalWins: number;
  lastPlayed: string | null; // date
};

const MIN_SIZE = 5;
const MAX_SIZE = 20;
const LOCAL_STORAGE_KEY = "picross:stats:v1";
const FIRST_GAME_DATE = "2026-10-18";

const game = ref<PicrossGame | null>(null);
const dateKey = ref("");
const gaveUp = ref(false);
const started = ref(false);
const grid = ref<InstanceType<typeof PicrossGrid> | null>(null);
const save = ref<PicrossSave>({
  history: {},
  totalMoves: 0,
  totalHintsUsed: 0,
  totalWins: 0,
  lastPlayed: null,
});
let timer: ReturnType<typeof setInterval> | undefined;
let countedMoves = 0;
let countedHints = 0;
let countedWin = false;

// Reactive clock so the countdown updates every tick
const now = ref(new Date());

const timeDisplay = computed(() => formatTime(game.value?.secondsElapsed ?? 0));
const timeTillNextGameDisplay = computed(() => {
  if (!game.value?.isCompleted) return "";
  return formatTime(getSecondsUntilNextDay(now.value));
});

const puzzleNumber = computed(() =>
  dateKey.value ? daysBetweenDateKeys(FIRST_GAME_DATE, dateKey.value) : null,
);

const subtitle = computed(() =>
  puzzleNumber.value !== null ? `Puzzle #${puzzleNumber.value}` : null,
);

// #region SAVE DATA
function loadSave() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PicrossSave>;
    save.value = {
      history: parsed.history ?? {},
      totalMoves: parsed.totalMoves ?? 0,
      totalHintsUsed: parsed.totalHintsUsed ?? 0,
      totalWins: parsed.totalWins ?? 0,
      lastPlayed: parsed.lastPlayed ?? null,
    };
  } catch (e) {
    console.error("Failed to load save data:", e);
  }
}

function writeSave() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(save.value));
  } catch (e) {
    console.error("Failed to write save data:", e);
  }
}

function persist() {
  const current = game.value;
  if (!current || !started.value) return;

  // Totals are only credited with progress made since the last persist
  save.value.totalMoves += current.moves - countedMoves;
  countedMoves = current.moves;
  save.value.totalHintsUsed += current.hintsUsed - countedHints;
  countedHints = current.hintsUsed;
  if (current.isCompleted && !gaveUp.value && !countedWin) {
    save.value.totalWins++;
    countedWin = true;
  }

  save.value.lastPlayed = dateKey.value;
  save.value.history[dateKey.value] = {
    board: current.board,
    hints: current.hints,
    size: current.size,
    isCompleted: current.isCompleted,
    moves: current.moves,
    hintsUsed: current.hintsUsed,
    secondsElapsed: current.secondsElapsed,
    gaveUp: gaveUp.value,
  };

  writeSave();
}
// #endregion SAVE DATA

// #region GAME INIT
// The same date always produces the same size and puzzle
function createDailyGame(key: string): PicrossGame {
  const random = mulberry32(`echolotl-picross-${key}`);
  const randomSide = () =>
    MIN_SIZE + Math.floor(random() * (MAX_SIZE - MIN_SIZE + 1));
  const size = { width: randomSide(), height: randomSide() };
  const solution = generateSolvableSolution(
    size,
    getHints,
    300,
    Infinity,
    random,
  );
  return createPicrossGame(size, solution);
}

function startDailyGame() {
  dateKey.value = getDateKey();
  const created = createDailyGame(dateKey.value);
  gaveUp.value = false;
  started.value = false;
  countedMoves = 0;
  countedHints = 0;
  countedWin = false;

  const saved = save.value.history[dateKey.value];
  if (saved && isValidBoard(saved.board, created.size)) {
    created.board = saved.board;
    created.moves = saved.moves ?? 0;
    created.hintsUsed = saved.hintsUsed ?? 0;
    created.secondsElapsed = saved.secondsElapsed ?? 0;
    created.isCompleted = saved.isCompleted ?? false;
    gaveUp.value = saved.gaveUp ?? false;
    started.value = true;
    countedMoves = created.moves;
    countedHints = created.hintsUsed;
    countedWin = created.isCompleted;
  }

  game.value = created;
  game.value.isCompleted = isBoardSolved(game.value);
}
// #endregion GAME INIT

function beginGame() {
  started.value = true;
  persist();
}

function giveUp() {
  if (!game.value || game.value.isCompleted) return;
  gaveUp.value = true;
  solveGame(game.value);
}

function useHint() {
  if (fillRandomTile(game.value!)) game.value!.hintsUsed++;
}

function copyWin() {
  if (!game.value || !game.value.isCompleted) return;
  const text = `
  Nautilus' Picross #${puzzleNumber.value} [${game.value.size.width}x${game.value.size.height}] ${gaveUp.value ? "❌" : "👑"}\n⬜ ${game.value.moves}\n💡 ${game.value.hintsUsed}\n🕒 ${formatTime(game.value.secondsElapsed)}\n\nhttps://echolotl.lol/picross/daily
  `.trim();
  navigator.clipboard.writeText(text);
}

onMounted(() => {
  loadSave();
  startDailyGame();
  timer = setInterval(() => {
    now.value = new Date();
    // Start the new puzzle if the page stayed open past midnight
    if (getDateKey(now.value) !== dateKey.value) {
      startDailyGame();
      return;
    }
    if (
      game.value &&
      started.value &&
      !game.value.isCompleted &&
      !document.hidden
    ) {
      game.value.secondsElapsed++;
    }
  }, 1000);
});

onBeforeUnmount(() => clearInterval(timer));

watch(game, persist, { deep: true });

useSeoMeta({
  title: "echolotl - Nautilus' Picross",
  description:
    "Play Nautilus' daily picross puzzle! Figure out the pattern the best you can every day.",
  ogDescription:
    "Play Nautilus' daily picross puzzle! (They are fed by puzzles)",
  ogTitle: "Nautilus' Picross",
  ogUrl: "https://echolotl.lol/picross/daily",
  ogImage: "https://echolotl.lol/images/picross/og.webp",
  twitterCard: "summary_large_image",
});
</script>

<style scoped>
.grid-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.start-overlay {
  position: absolute;
  inset: 4rem;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: center;

  > button {
    padding: 8px 12px;
    text-transform: uppercase;
    font-weight: bold;
    box-shadow: 0 0 0 4px var(--surface);
  }
}

.daily-info {
  display: flex;
  align-items: center;
  gap: 8px;

  > span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
