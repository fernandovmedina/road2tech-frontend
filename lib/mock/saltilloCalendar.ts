import type { Weekday } from "@/types/weekday";

// Saltillo (America/Monterrey) stays on UTC-6 all year: Mexico dropped DST in 2022.
const SALTILLO_OFFSET_MS = -6 * 60 * 60 * 1000;
const SALTILLO_ISO_OFFSET = "-06:00";

const WEEKDAY_BY_JS_DAY: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type ClockTime = `${number}:${number}`;

/**
 * Next date strictly after today (Saltillo calendar) that falls on `weekday`,
 * pushed `weeksAhead` extra weeks, as a Saltillo wall-clock ISO timestamp.
 * Relative dates keep the demo full of upcoming events whenever it runs.
 */
export function upcomingSaltilloIso(
  now: Date,
  weekday: Weekday,
  weeksAhead: number,
  time: ClockTime,
): string {
  const saltilloNow = new Date(now.getTime() + SALTILLO_OFFSET_MS);
  const todayIndex = saltilloNow.getUTCDay();
  const targetIndex = WEEKDAY_BY_JS_DAY.indexOf(weekday);
  const daysAhead = ((targetIndex - todayIndex + 7) % 7 || 7) + weeksAhead * 7;
  const date = new Date(
    Date.UTC(
      saltilloNow.getUTCFullYear(),
      saltilloNow.getUTCMonth(),
      saltilloNow.getUTCDate() + daysAhead,
    ),
  );
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${time}:00${SALTILLO_ISO_OFFSET}`;
}

/** Weekday of a Saltillo ISO timestamp, read from its local date part. */
export function saltilloWeekdayOf(iso: string): Weekday {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return WEEKDAY_BY_JS_DAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
