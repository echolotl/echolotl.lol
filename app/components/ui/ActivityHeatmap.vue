<template>
  <div ref="root" class="activity-heatmap">
    <div class="activity-heatmap-inner">
      <table>
        <thead>
          <tr>
            <td></td>
            <th
              v-for="month in monthHeaders"
              :key="month.key"
              :colspan="month.span"
              scope="colgroup"
            >
              <span class="month-label">{{ month.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ROWS" :key="row">
            <th scope="row" class="day-label">
              {{ [1, 3, 5].includes(row - 1) ? DAY_LABELS[row - 1] : "" }}
            </th>
            <td v-for="weekStart in weekStarts" :key="weekStart.getTime()">
              <Tooltip direction="top" display-only>
                <div
                  v-if="cellDate(weekStart, row - 1) <= today"
                  class="activity-cell"
                  :class="`lvl-${getRelativeActivity(dateKey(cellDate(weekStart, row - 1)))}`"
                  :style="
                    getActivityStyle(dateKey(cellDate(weekStart, row - 1)))
                  "
                  :title="dateKey(cellDate(weekStart, row - 1))"
                ></div>
                <template #text>
                  <div style="display: flex; align-items: center">
                    <span class="text-secondary tooltip-text"
                      >{{
                        describeActivity(dateKey(cellDate(weekStart, row - 1)))
                      }}
                      on
                      {{ formatDate(cellDate(weekStart, row - 1)) }}</span
                    >
                  </div>
                </template>
              </Tooltip>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="activity-heatmap-legend">
        <div class="activity-type-legend">
          <span
            v-for="(count, unit) in numberOfItemsPerTypeWithinRange"
            :key="unit"
            class="activity-type-legend-item"
          >
            <span
              class="activity-type-legend-color"
              :style="{ backgroundColor: getActivityColor(unit) }"
            ></span>
            {{ pluralize(count, unit) }} in the past
            {{ formatTimeSpan(oldestDate) }}
          </span>
        </div>
        <div>
          <span style="margin-right: 4px">Less</span>
          <span class="activity-heatmap-legend-color lvl-0"></span>
          <span class="activity-heatmap-legend-color lvl-1"></span>
          <span class="activity-heatmap-legend-color lvl-2"></span>
          <span class="activity-heatmap-legend-color lvl-3"></span>
          <span class="activity-heatmap-legend-color lvl-4"></span>
          <span style="margin-left: 4px">More</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTimeSpan } from "~/utils";
import Tooltip from "~/components/ui/Tooltip.vue";

// Multiple activities (e.g. art, blog posts, etc) can be tracked per date
type Activity = {
  unit: string;
  count: number;
};
type ActivityData = {
  activitiesByDate: Record<string, Activity[]>;
  colorsByUnit: Record<string, string>;
};

const props = withDefaults(
  defineProps<{
    data: ActivityData;
    weeks?: number;
  }>(),
  {
    weeks: 52,
  },
);

const CELL_SIZE = 14;
const MIN_WEEKS = 8;
const FALLBACK_LABEL_WIDTH = 36;

const root = ref<HTMLElement | null>(null);
// Number of weeks that fit the container; null until measured (renders all weeks)
const fittingWeeks = ref<number | null>(null);

// Drops the oldest weeks on narrow screens instead of overflowing the page
const COLUMNS = computed(() =>
  Math.min(props.weeks, fittingWeeks.value ?? props.weeks),
);
const ROWS = 7;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function updateFittingWeeks() {
  const el = root.value;
  if (!el) return;
  const labelWidth =
    el.querySelector<HTMLElement>(".day-label")?.offsetWidth ||
    FALLBACK_LABEL_WIDTH;
  const fit = Math.floor((el.clientWidth - labelWidth) / CELL_SIZE);
  fittingWeeks.value = Math.max(MIN_WEEKS, fit);
}

let resizeObserver: ResizeObserver | undefined;
onMounted(() => {
  updateFittingWeeks();
  if (root.value) {
    resizeObserver = new ResizeObserver(updateFittingWeeks);
    resizeObserver.observe(root.value);
  }
});
onBeforeUnmount(() => resizeObserver?.disconnect());

// All dates are handled in UTC so the grid never depends on the viewer's time zone
const today = new Date();
const oldestDate = computed(
  () =>
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (COLUMNS.value - 1) * 7 - today.getUTCDay(),
      ),
    ),
);

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function cellDate(weekStart: Date, dayOffset: number) {
  return new Date(
    Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate() + dayOffset,
    ),
  );
}

// Sunday of each week column, oldest first, ending with the current week
const weekStarts = computed(() => {
  const currentWeekStart = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - today.getUTCDay(),
    ),
  );
  return Array.from({ length: COLUMNS.value }, (_, i) =>
    cellDate(currentWeekStart, -(COLUMNS.value - 1 - i) * 7),
  );
});

// Consecutive week columns sharing a month are merged into one header cell
const monthHeaders = computed(() => {
  const headers: { key: string; label: string; span: number }[] = [];
  for (const start of weekStarts.value) {
    const key = `${start.getUTCFullYear()}-${start.getUTCMonth()}`;
    const last = headers[headers.length - 1];
    if (last && last.key === key) {
      last.span++;
    } else {
      headers.push({
        key,
        label: start.toLocaleDateString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        span: 1,
      });
    }
  }

  // A single-column first month has no room for its label
  if (headers[0] && headers[0].span < 2) headers[0].label = "";
  return headers;
});

const histogram = computed(() => {
  const counts: { [date: string]: number } = {};
  for (const [date, activities] of Object.entries(
    props.data.activitiesByDate,
  )) {
    counts[date] = activities.reduce((sum, a) => sum + a.count, 0);
  }
  return counts;
});

function getActivityColor(unit: string) {
  return props.data.colorsByUnit[unit] ?? "var(--theme-color, var(--primary))";
}

function getActivityStyle(date: string): Record<string, string> {
  const countsByUnit = new Map<string, number>();
  for (const { unit, count } of props.data.activitiesByDate[date] ?? []) {
    if (count > 0)
      countsByUnit.set(unit, (countsByUnit.get(unit) ?? 0) + count);
  }
  const total = [...countsByUnit.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  if (!total) return {};

  const tint = getRelativeActivity(date) * 20;
  let start = 0;
  const stops = [...countsByUnit.entries()]
    .sort(([unitA], [unitB]) => unitA.localeCompare(unitB))
    .map(([unit, count]) => {
      const end = (start + count / total) * 100;
      const color = `color-mix(in oklab, ${getActivityColor(unit)} ${tint}%, var(--surface) ${100 - tint}%)`;
      const stop = `${color} ${start}% ${end}%`;
      start = end;
      return stop;
    });

  return {
    backgroundImage: `conic-gradient(from -90deg, ${stops.join(", ")})`,
  };
}

// Only dates inside the displayed range count towards the scale
const maxActivity = computed(() => {
  const first = weekStarts.value[0];
  if (!first) return 0;
  const start = dateKey(first);
  const end = dateKey(today);
  let max = 0;
  for (const [date, count] of Object.entries(histogram.value)) {
    if (date >= start && date <= end && count > max) max = count;
  }
  return max;
});

const numberOfItemsPerTypeWithinRange = computed(() => {
  const first = weekStarts.value[0];
  if (!first) return {};
  const start = dateKey(first);
  const end = dateKey(today);
  const counts: { [unit: string]: number } = {};
  for (const [date, activities] of Object.entries(
    props.data.activitiesByDate,
  )) {
    if (date < start || date > end) continue;
    for (const { unit, count } of activities) {
      counts[unit] = (counts[unit] ?? 0) + count;
    }
  }
  return counts;
});

function pluralize(count: number, unit: string) {
  return `${count} ${unit}${count > 1 ? "s" : ""}`;
}

// e.g. "2 arts, 1 post", summing counts that share a unit
function describeActivity(date: string) {
  const totals: { [unit: string]: number } = {};
  for (const { unit, count } of props.data.activitiesByDate[date] ?? []) {
    if (count > 0) totals[unit] = (totals[unit] ?? 0) + count;
  }
  const parts = Object.entries(totals).map(([unit, count]) =>
    pluralize(count, unit),
  );
  return parts.length ? parts.join(", ") : "No activity";
}

/**
 * Returns a number 0-4 representing the relative activity level for the given date
 * @param date
 */
function getRelativeActivity(date: string) {
  const count = histogram.value[date] || 0;
  if (!count) return 0;
  return Math.max(1, Math.ceil((count / (maxActivity.value || 1)) * 4));
}
</script>

<style scoped>
.activity-heatmap {
  width: 100%;
}
.activity-heatmap-inner {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}
table {
  border-collapse: separate;
  border-spacing: 0;
}
td,
th {
  padding: 0;
  font-weight: normal;
}
td {
  width: 14px;
  height: 14px;
  min-width: 14px;
}
thead th {
  position: relative;
  height: 1.2em;
}
.month-label {
  position: absolute;
  left: 0;
  bottom: 0;
  white-space: nowrap;
  font-size: var(--very-small-text);
  text-transform: uppercase;
  padding-left: 2px;
}
.day-label {
  font-size: var(--very-small-text);
  text-align: left;
  padding-right: 4px;
  white-space: nowrap;
}
.activity-cell,
.activity-heatmap-legend-color {
  --color: var(--theme-color, var(--primary));
  width: 12px;
  height: 12px;
  margin: 1px;
  display: block;
  border-radius: 4px;

  &.lvl-0 {
    background-color: var(--surface);
  }
  &.lvl-1 {
    background-color: color-mix(in oklab, var(--color) 20%, var(--surface) 80%);
  }
  &.lvl-2 {
    background-color: color-mix(in oklab, var(--color) 40%, var(--surface) 60%);
  }
  &.lvl-3 {
    background-color: color-mix(in oklab, var(--color) 60%, var(--surface) 40%);
  }
  &.lvl-4 {
    background-color: color-mix(in oklab, var(--color) 80%, var(--surface) 20%);
  }
}

.activity-type-legend {
  margin-top: 2px;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.activity-type-legend-item {
  gap: 4px;
}
.activity-type-legend-color {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 3px;
}
.activity-heatmap-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px;
  font-size: var(--very-small-text);
  color: var(--text-secondary);
  > * {
    display: flex;
    align-items: center;
  }
}
.tooltip-text {
  font-size: var(--very-small-text);
  color: var(--text-secondary);
  line-height: 1.2;
}
</style>
