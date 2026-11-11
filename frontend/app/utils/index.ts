// Dates are always shown in UTC so they never depend on the viewer's time zone
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  }).format(date);
}

export function formatTime(total: number) {
  // in seconds
  const parts = [];
  const days = Math.floor(total / 86400);
  if (days > 0) parts.push(String(days));
  total %= 86400;
  const hours = Math.floor(total / 3600);
  if (hours > 0 || parts.length > 0) parts.push(String(hours).padStart(2, "0"));
  total %= 3600;
  const minutes = Math.floor(total / 60);
  parts.push(String(minutes).padStart(2, "0"));
  const seconds = total % 60;
  parts.push(String(seconds).padStart(2, "0"));
  return parts.join(":");
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
  ["second", 1000],
];

const auto = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const deltaMs = now.getTime() - date.getTime();
  for (const [unit, ms] of units) {
    if (Math.abs(deltaMs) >= ms) {
      return auto.format(Math.round(deltaMs / ms), unit);
    }
  }
  return auto.format(0, "second");
}

/**
 * Formats the time between two dates without a direction suffix, e.g. "3 months".
 * @param date The date to measure from.
 * @param now The date to measure to. Defaults to the current time.
 */
export function formatTimeSpan(date: Date, now: Date = new Date()): string {
  const deltaMs = Math.abs(now.getTime() - date.getTime());
  for (const [unit, ms] of units) {
    if (deltaMs >= ms) {
      return new Intl.NumberFormat("en-US", {
        style: "unit",
        unit,
        unitDisplay: "long",
      }).format(Math.round(deltaMs / ms));
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "second",
    unitDisplay: "long",
  }).format(0);
}

export function formatWithZeros(num: number, length: number) {
  return String(num).padStart(length, "0");
}

/**
 * Converts a URL string or URL object to a safe URL if it uses the http or https protocol.
 * @returns A safe URL string if the input is a valid http(s) URL, otherwise null.
 * @param value The URL string or URL object to be converted to a safe URL.
 */
export function toSafeHTTPUrl(value: string | URL | undefined): string | null {
  if (!value) return null;
  try {
    const url = value instanceof URL ? value : new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function feetStringToCm(feetString: string): number {
  const parts = feetString.split("'");
  if (parts.length !== 2) {
    throw new Error("Invalid feet string format");
  }
  const feet = parseInt(parts[0] || "0", 10);
  const inches = parseInt((parts[1] || "0").replace('"', ""), 10);
  return Math.round((feet * 12 + inches) * 2.54);
}

// This is terrible and uses the deprecated `document.execCommand`,
// but it's the best way to insert plain text into a contenteditable element
export function insertPlainText(text: string) {
  document.execCommand("insertText", false, text);
}

export function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export function hashString(str: string) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
