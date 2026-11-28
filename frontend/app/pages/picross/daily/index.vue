<template>
  <PicrossPage :subtitle="subtitle" :accent="theme ? '#26a4ad' : '#38d9e4'">
    <PicrossGrid v-if="game" ref="grid" :game="game" :locked="!started">
      <template #board-overlay>
        <div
          v-if="!started"
          class="start-overlay lotl-font"
          role="button"
          tabindex="0"
          @click="beginGame"
          @keydown.enter.prevent="beginGame"
          @keydown.space.prevent="beginGame"
        >
          click to start!
        </div>
      </template>
    </PicrossGrid>
    <p v-else-if="loading" class="lotl-font loading" role="status">
      <Icon icon="loading" size="20px" />
      Loading puzzle...
    </p>
    <div v-else-if="loadError" class="load-error lotl-font loading">
      <p role="alert">{{ loadError }}</p>
      <button @click="startDailyGame" class="round">
        <Icon icon="reload" size="1.3lh" />Retry
      </button>
    </div>

    <p
      v-if="game"
      class="daily-info text-secondary lotl-font"
      :style="{ color: game.isCompleted ? 'var(--primary)' : undefined }"
    >
      <span v-if="game.isCompleted && !gaveUp">
        <Icon
          icon="crown"
          size="16px"
          :style="{ color: 'var(--orange)' }"
        ></Icon>
      </span>
      <span>
        <Icon icon="time" size="16px" />
        <SlotText :text="timeDisplay" :options="{ skipUnchanged: true }" />
      </span>
      <span>
        <Icon icon="moves" size="16px" />
        <SlotText
          :text="String(game?.moves ?? 0)"
          :options="{ skipUnchanged: true }"
        />
      </span>
      <span>
        <Icon icon="tip" size="16px" />
        <SlotText
          :text="String(game?.hintsUsed ?? 0)"
          :options="{ skipUnchanged: true }"
        />
      </span>
      <span>
        <Icon icon="size" size="16px" />
        {{ game?.size.width ?? 0 }}x{{ game?.size.height ?? 0 }}
      </span>
    </p>
    <div v-if="game?.isCompleted" class="game-actions">
      <button @click="copyWin" class="round filled">
        <Icon icon="copy" size="16px" />
        Copy Result
      </button>
    </div>
    <div v-if="game?.isCompleted" class="completion-stats">
      <div class="completion-stat">
        <div class="completion-stat-value lotl-font">
          <Icon icon="streak" size="24px" />
          <span>{{ completionStreak }}</span>
        </div>
        <span
          class="completion-stat-label"
          :style="completionStreak > 7 ? 'color: var(--yellow)' : undefined"
          >Streak</span
        >
      </div>
      <div class="completion-stat">
        <div class="completion-stat-value lotl-font">
          <Icon icon="candy" size="24px" />
          <span>{{ save.totalWins }}</span>
        </div>
        <span class="completion-stat-label">Candies</span>
      </div>
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
      <button @click="clearDailyBoard" class="round">
        <Icon icon="trash" size="20px" />
        Clear
      </button>
      <button @click="giveUp" class="round filled red">Give Up</button>
      <button @click="useHint" class="round">
        <Icon icon="tip" size="20px" />
        Hint
      </button>
    </div>
  </PicrossPage>
</template>

<script setup lang="ts">
import PicrossPage from "~/components/picross/PicrossPage.vue";
import PicrossInputControls from "~/components/picross/PicrossInputControls.vue";
import PicrossGrid from "~/components/picross/PicrossGrid.vue";
import { SlotText } from "slot-text/vue";
import "slot-text/style.css";
import {
  createPicrossGame,
  type PicrossGame,
  fillRandomTile,
  isBoardSolved,
  clearBoard,
  solveGame,
  isValidBoard,
} from "~/utils/picross";
import {
  createPicrossSave,
  getPicrossStreak,
  loadPicrossSave,
  persistPicrossSave,
} from "~/utils/picross/save";
import {
  getSecondsUntilNextDay,
  DAILY_TIME_ZONE,
  FIRST_GAME_DATE,
} from "@echolotl/picross/daily";
import { daysBetweenDateKeys, getDateKey } from "@echolotl/utils/calendar";
import { formatTime } from "@echolotl/utils";
import { loadPicrossPuzzle } from "@echolotl/picross/file";
import Icon from "~/components/ui/Icon.vue";

const { theme } = useTheme();
const config = useRuntimeConfig();
const route = useRoute();

definePageMeta({
  pageTransition: false,
  viewTransition: true,
});

const game = ref<PicrossGame | null>(null);
const dateKey = ref("");
const puzzleId = ref("");
const loading = ref(true);
const loadError = ref("");
const gaveUp = ref(false);
const started = ref(false);
const grid = ref<InstanceType<typeof PicrossGrid> | null>(null);
const save = ref(createPicrossSave());
let timer: ReturnType<typeof setInterval> | undefined;
let counted = { moves: 0, hints: 0, win: false };
let requestId = 0;
let controller: AbortController | undefined;
let clockOffset = 0;
let observedDay = "";

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

const completionStreak = computed(() => {
  if (!dateKey.value || !game.value?.isCompleted || gaveUp.value) return 0;
  return getPicrossStreak(save.value, dateKey.value);
});

function persist() {
  if (!game.value || !started.value) return;
  persistPicrossSave(
    save.value,
    game.value,
    dateKey.value,
    puzzleId.value,
    gaveUp.value,
    counted,
  );
}

// #region GAME INIT
async function startDailyGame() {
  const id = ++requestId;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  loadError.value = "";
  game.value = null;
  gaveUp.value = false;
  started.value = false;
  counted = { moves: 0, hints: 0, win: false };

  try {
    if (!config.public.backendEnabled || !config.public.backendUrl) {
      throw new Error("The puzzle server is not configured.");
    }
    const requestedDate =
      typeof route.query.date === "string" ? route.query.date : "today";
    const response = await fetch(
      `${config.public.backendUrl}/picross/${encodeURIComponent(requestedDate)}`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new Error(`Puzzle server returned ${response.status}.`);
    const key = response.headers.get("X-Picross-Date");
    const serverNow = response.headers.get("X-Picross-Now");
    if (!key || !serverNow) {
      throw new Error("Puzzle server returned an invalid date.");
    }
    const puzzle = loadPicrossPuzzle(
      new Uint8Array(await response.arrayBuffer()),
    );
    if (id !== requestId) return;
    clockOffset = Date.parse(serverNow) - Date.now();
    now.value = new Date(Date.now() + clockOffset);
    observedDay = key;
    dateKey.value = key;
    puzzleId.value = JSON.stringify(puzzle);
    const created = createPicrossGame(puzzle.size, puzzle.solution);
    created.palette = puzzle.palette;
    created.metadata = puzzle.metadata;

    const saved = save.value.history[key];
    if (
      saved &&
      saved.puzzleId === puzzleId.value &&
      isValidBoard(saved.board, created.size)
    ) {
      created.board = saved.board;
      created.moves = saved.moves ?? 0;
      created.hintsUsed = saved.hintsUsed ?? 0;
      created.secondsElapsed = saved.secondsElapsed ?? 0;
      created.isCompleted = saved.isCompleted ?? false;
      gaveUp.value = saved.gaveUp ?? false;
      started.value = true;
      counted = {
        moves: created.moves,
        hints: created.hintsUsed,
        win: created.isCompleted,
      };
    }
    game.value = created;
    game.value.isCompleted = isBoardSolved(game.value);
  } catch (error) {
    if (id !== requestId) return;
    console.error("Failed to load daily puzzle:", error);
    loadError.value =
      "Erm... something went wrong loading today's puzzle. Maybe try again?";
  } finally {
    if (id === requestId) loading.value = false;
  }
}
// #endregion GAME INIT

function clearDailyBoard() {
  if (!game.value) return;
  clearBoard(game.value);
  grid.value?.clearHistory();
}

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
  save.value = loadPicrossSave() ?? save.value;
  observedDay = getDateKey(new Date(), DAILY_TIME_ZONE);
  startDailyGame();
  timer = setInterval(() => {
    now.value = new Date(Date.now() + clockOffset);
    // Start the new puzzle if the page stayed open past midnight
    if (
      typeof route.query.date !== "string" &&
      getDateKey(now.value, DAILY_TIME_ZONE) !== observedDay
    ) {
      observedDay = getDateKey(now.value, DAILY_TIME_ZONE);
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

onBeforeUnmount(() => {
  requestId++;
  controller?.abort();
  clearInterval(timer);
});

watch(game, persist, { deep: true });
watch(
  () => route.query.date,
  () => startDailyGame(),
);

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

<style scoped lang="scss">
@use "~/assets/styles/util" as *;

.start-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: var(--primary);
  font-size: 1.5rem;
  @include color-text-stroke(var(--surface), 6px);

  &:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
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

.loading.load-error {
  flex-direction: column;
  color: var(--red);
  > button {
    padding: 4px 6px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
}
.completion-stats {
  display: flex;
  justify-content: center;
  gap: 1rem;

  .completion-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    .completion-stat-value {
      display: flex;
      align-items: center;
      line-height: 1;
      gap: 0.25rem;

      span {
        display: flex;
        align-items: center;
      }
    }

    .completion-stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
    }
  }
}
</style>
