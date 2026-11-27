export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

// Calendar date as YYYY-MM-DD in the specified time zone (UTC by default).
export function getDateKey(date = new Date(), timeZone = "UTC") {
  let formatter = dateKeyFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateKeyFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addUtcDays(date: Date, days: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
}

// Whole calendar days from one YYYY-MM-DD key to another.
export function daysBetweenDateKeys(from: string, to: string) {
  const toUtcDay = (key: string) => {
    const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getCalendarMonths(firstDate: string, lastDate: string) {
  if (lastDate < firstDate) return [];

  const [firstYear, firstMonth] = firstDate.split("-").map(Number);
  const [lastYear, lastMonth] = lastDate.split("-").map(Number);
  const months = [];

  for (
    let date = new Date(Date.UTC(firstYear!, firstMonth! - 1, 1));
    date.getUTCFullYear() < lastYear! ||
    (date.getUTCFullYear() === lastYear && date.getUTCMonth() < lastMonth!);
    date.setUTCMonth(date.getUTCMonth() + 1)
  ) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: (number | null)[] = Array(date.getUTCDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${monthNames[month]} ${year}`,
      weeks,
    });
  }

  return months;
}
