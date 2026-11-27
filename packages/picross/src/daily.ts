import { getDateKey } from "@echolotl/utils/calendar";

// The daily puzzle changes at midnight in this timezone, regardless of the player's own
export const DAILY_TIME_ZONE = "America/Chicago";
export const FIRST_GAME_DATE = "2026-10-18"; // save data was reset on 2026-11-12. This is technically the first game date though

// Seconds until the date in DAILY_TIME_ZONE next changes. Found by search so
// 23 and 25 hour days (daylight saving changes) are handled correctly.
export function getSecondsUntilNextDay(now = new Date()) {
  const today = getDateKey(now, DAILY_TIME_ZONE);
  let low = 0;
  let high = 26 * 3600;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (
      getDateKey(new Date(now.getTime() + mid * 1000), DAILY_TIME_ZONE) ===
      today
    )
      low = mid;
    else high = mid;
  }
  return high;
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
