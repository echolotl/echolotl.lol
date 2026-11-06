<template>
  <div class="activity-heatmap">
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
      <span>
        <span
          v-for="(count, unit) in numberOfItemsPerTypeWithinRange"
          :key="unit"
        >
          {{ pluralize(count, unit) }} in the past
          {{ formatTimeSpan(oldestDate) }}
        </span>
      </span>
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
</template>

<script setup lang="ts">
import { formatTimeSpan } from "~/utils";
import Tooltip from "../common/Tooltip.vue";

// Multiple activities (e.g. art, blog posts, etc) can be tracked per date
type Activity = {
  unit: string;
  count: number;
};
type ActivityData = {
  [date: string]: Activity[];
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

const COLUMNS = computed(() => props.weeks);
const ROWS = 7;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// All dates are handled in UTC so the grid never depends on the viewer's time zone
const today = new Date();
const oldestDate = new Date(
  Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - (COLUMNS.value - 1) * 7 - today.getUTCDay(),
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
  for (const date in props.data) {
    counts[date] = props.data[date]!.reduce((sum, a) => sum + a.count, 0);
  }
  return counts;
});

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
  for (const [date, activities] of Object.entries(props.data)) {
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
  for (const { unit, count } of props.data[date] ?? []) {
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
  display: inline-block;
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

.activity-heatmap-legend {
  display: flex;
  align-items: center;
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
