// The daily puzzle changes at midnight in this timezone, regardless of the player's own
export const DAILY_TIME_ZONE = "America/Chicago";

const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Calendar date in DAILY_TIME_ZONE as YYYY-MM-DD, used to key the daily puzzle
export function getDateKey(date = new Date()) {
  const parts = Object.fromEntries(
    dateKeyFormatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Seconds until the date in DAILY_TIME_ZONE next changes. Found by search so
// 23 and 25 hour days (daylight saving changes) are handled correctly.
export function getSecondsUntilNextDay(now = new Date()) {
  const today = getDateKey(now);
  let low = 0;
  let high = 26 * 3600;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (getDateKey(new Date(now.getTime() + mid * 1000)) === today) low = mid;
    else high = mid;
  }
  return high;
}

// Whole calendar days from one YYYY-MM-DD key to another
export function daysBetweenDateKeys(from: string, to: string) {
  const toUtcDay = (key: string) => {
    const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

/**
 * mulberry32 PRNG, but seeded from a string instead of a number
 * @param seed 
 * @returns The PRNG function, which should be used to generate a random number.
 */
export function mulberry32(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
