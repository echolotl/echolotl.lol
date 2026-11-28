<template>
  <PicrossPage subtitle="Past Puzzles" :accent="theme ? '#26a4ad' : '#38d9e4'">
    <div v-if="save">
      <table class="stats-table">
        <thead>
          <tr>
            <th scope="col">Streak</th>
            <th scope="col">Puzzles Fed</th>
            <th scope="col">Games Started</th>
            <th scope="col">Total Moves</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="stat-content">
                <Icon icon="streak" size="32px" />
                <div class="stat-value lotl-font">{{ streak }}</div>
              </div>
            </td>
            <td>
              <div class="stat-content">
                <Icon icon="candy" size="32px" />
                <div class="stat-value lotl-font">
                  {{ save?.totalWins ?? 0 }}
                </div>
              </div>
            </td>
            <td>
              <div class="stat-content">
                <Icon icon="picross" size="32px" />
                <div class="stat-value lotl-font">
                  {{ Object.keys(save?.history ?? {}).length ?? 0 }}
                </div>
              </div>
            </td>
            <td>
              <div class="stat-content">
                <Icon icon="moves" size="32px" />
                <div class="stat-value lotl-font">
                  {{ save?.totalMoves ?? 0 }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <div class="loading-stats lotl-font">
        <Icon icon="loading" size="24px" /> Loading stats...
      </div>
    </div>
    <div class="calendar-grid">
      <table v-for="month in months" :key="month.key" class="calendar">
        <caption class="lotl-font">
          {{
            month.label
          }}
        </caption>
        <thead></thead>
        <tbody>
          <tr v-for="(week, index) in month.weeks" :key="index">
            <td v-for="(day, dayIndex) in week" :key="dayIndex">
              <button
                type="button"
                :disabled="isDateDisabled(month.key, day)"
                :class="getDateClass(month.key, day)"
                @click="openDate(month.key, day)"
              >
                <span class="day lotl-font">{{ day }}</span>
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot
          v-if="
            month.key === today.slice(0, 7) && save?.history[today]?.isCompleted
          "
        >
          <tr>
            <td colspan="7">
              <p class="next-game text-secondary">
                Next game in:
                <b>
                  <SlotText
                    :text="timeTillNextGame"
                    :options="{ skipUnchanged: true }"
                  />
                </b>
              </p>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </PicrossPage>
</template>
<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 300px);
  justify-content: center;
  margin-top: 2rem;
  width: 100%;
  gap: 1rem;
}
.loading-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  color: var(--text-secondary);
  height: 36px;
}
.nonexisty {
  visibility: hidden;
}
.calendar {
  border-collapse: collapse;
  table-layout: fixed;
  width: 300px;
}
.calendar th,
.calendar td {
  text-align: center;
}
.calendar th,
.calendar td {
  width: calc(100% / 7);
  padding: 0.25rem 0;
}
.calendar caption {
  padding-bottom: 0.5rem;
  font-size: 1.25rem;
}
.calendar button {
  border: none;
  justify-content: center;
  width: 36px;
  height: 36px;
  aspect-ratio: 1 / 1;
  padding: 0.5rem;
  border-radius: 9999px;

  &.in-progress {
    outline: 2px solid var(--blue);
  }
  &.completed {
    background: var(--primary);
    color: white;
  }
  &.gave-up {
    background: var(--red);
    color: white;
  }
  &.today {
    outline: 2px solid var(--primary);
  }
}
.calendar .day {
  display: inline-block;
  line-height: 1;
  width: 24px;
}
.next-game {
  margin: 0.5rem 0 0;
}

.stats-table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  max-width: 600px;

  tbody {
    background: var(--background);
  }
}
.stats-table th,
.stats-table td {
  padding: 0.5rem;
  text-align: center;
}
.stats-table th {
  color: var(--text-secondary);
  text-transform: uppercase;
}
.stat-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}
.stat-value {
  font-size: 1.5rem;
}
</style>
<script lang="ts" setup>
function getDateClass(monthKey: string, day: number | null) {
  if (day === null) return "nonexisty";
  const dateKey = `${monthKey}-${formatWithZeros(day, 2)}`;
  const saved = save.value?.history[dateKey];
  if (saved?.isCompleted && saved?.gaveUp) return "gave-up";
  if (saved?.isCompleted) return "completed";
  if (!saved?.isCompleted && !saved?.gaveUp && saved) return "in-progress";
  if (isDateToday(monthKey, day)) return "today";
  return "";
}
import {
  DAILY_TIME_ZONE,
  FIRST_GAME_DATE,
  getSecondsUntilNextDay,
} from "@echolotl/picross/daily";
import { formatTime, formatWithZeros } from "@echolotl/utils";
import {
  getCalendarMonths,
  getDateKey,
  WEEKDAY_LABELS,
} from "@echolotl/utils/calendar";
import {
  createPicrossSave,
  getPicrossStreak,
  loadPicrossSave,
  type PicrossSave,
} from "~/utils/picross/save";
import Icon from "~/components/ui/Icon.vue";
import { SlotText } from "slot-text/vue";
import "slot-text/style.css";

const { theme } = useTheme();
const today = computed(() => getDateKey(now.value, DAILY_TIME_ZONE));
const save = ref<PicrossSave | null>(null);
const months = computed(() => getCalendarMonths(FIRST_GAME_DATE, today.value));
const streak = computed(() => getPicrossStreak(save.value, today.value));
const timeTillNextGame = computed(() =>
  formatTime(getSecondsUntilNextDay(now.value)),
);

const now = ref(new Date());
let clockTimer: ReturnType<typeof setInterval> | undefined;

function isDateDisabled(monthKey: string, day: number | null) {
  if (day === null) return true;

  const dateKey = `${monthKey}-${formatWithZeros(day, 2)}`;
  return dateKey > today.value || dateKey < FIRST_GAME_DATE;
}
function isDateToday(monthKey: string, day: number | null) {
  if (day === null) return false;
  const dateKey = `${monthKey}-${formatWithZeros(day, 2)}`;
  return dateKey === today.value;
}
function openDate(monthKey: string, day: number | null) {
  if (isDateDisabled(monthKey, day) || day === null) return;
  navigateTo(`/picross/daily?date=${monthKey}-${formatWithZeros(day, 2)}`);
}
onMounted(() => {
  save.value = loadPicrossSave() ?? createPicrossSave();
  now.value = new Date();
  clockTimer = setInterval(() => {
    now.value = new Date();
  }, 1000);
});
onBeforeUnmount(() => {
  clearInterval(clockTimer);
});
</script>
