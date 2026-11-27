<template>
  <PicrossPage subtitle="Past Puzzles" :accent="theme ? '#26a4ad' : '#38d9e4'">
    <div class="calendar-grid">
      <table v-for="month in months" :key="month.key" class="calendar">
        <caption class="lotl-font">
          {{
            month.label
          }}
        </caption>
        <thead>
          <tr>
            <th v-for="day in WEEKDAY_LABELS" :key="day" scope="col">
              {{ day }}
            </th>
          </tr>
        </thead>
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
import { DAILY_TIME_ZONE, FIRST_GAME_DATE } from "@echolotl/picross/daily";
import { formatWithZeros } from "@echolotl/utils";
import {
  getCalendarMonths,
  getDateKey,
  WEEKDAY_LABELS,
} from "@echolotl/utils/calendar";
import { loadPicrossSave, type PicrossSave } from "~/utils/picross/save";

const { theme } = useTheme();
const today = computed(() => getDateKey(now.value, DAILY_TIME_ZONE));
const save = ref<PicrossSave | null>(null);
const months = computed(() => getCalendarMonths(FIRST_GAME_DATE, today.value));

const now = ref(new Date());

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
  save.value = loadPicrossSave() ?? null;
});
</script>
