import { addDays, parseIso, toIso } from "@/lib/format";

// Month grid helpers. They only build the grid from ISO dates; "today" is never decided here (it is data_as_of).

export type MonthCursor = { year: number; month: number }; // month: 0-11
export type GridDay = { iso: string; day: number; inMonth: boolean };

export function cursorOf(iso: string): MonthCursor {
  const d = parseIso(iso);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth(c: MonthCursor, delta: number): MonthCursor {
  const d = new Date(c.year, c.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Monday-first grid with only the weeks the month needs (4 to 6 rows). */
export function gridDays(c: MonthCursor): GridDay[] {
  const firstIso = toIso(new Date(c.year, c.month, 1));
  const daysInMonth = new Date(c.year, c.month + 1, 0).getDate();
  const offset = (parseIso(firstIso).getDay() + 6) % 7;
  const rows = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: rows * 7 }, (_, i) => {
    const iso = addDays(firstIso, i - offset);
    const d = parseIso(iso);
    return { iso, day: d.getDate(), inMonth: d.getMonth() === c.month };
  });
}
