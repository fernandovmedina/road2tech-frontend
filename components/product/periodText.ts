import { copy } from "@/lib/copy";
import { parseIso } from "@/lib/format";

const day = new Intl.DateTimeFormat("es-MX", { day: "numeric" });
const month = new Intl.DateTimeFormat("es-MX", { month: "long" });
const MS_PER_DAY = 86_400_000;

/** Whole days from `from` to `to` (ISO dates), negative when `to` is earlier. */
export const daysBetween = (from: string, to: string): number => Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / MS_PER_DAY);

/** "12 al 18 de octubre" (same month) or "28 de octubre al 3 de noviembre". */
function rangeText(start: string, end: string): string {
  const a = parseIso(start);
  const b = parseIso(end);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${day.format(a)} al ${day.format(b)} de ${month.format(b)}`;
  return `${day.format(a)} de ${month.format(a)} al ${day.format(b)} de ${month.format(b)}`;
}

/** Days a promotion lasts, both ends included. */
export const periodDays = (start: string, end: string): number => daysBetween(start, end) + 1;

/** "Semana del 12 al 18 de octubre" for 7-day promotions, "Del 12 al 15 de octubre" otherwise. */
export function periodLabel(start: string, end: string): string {
  const range = rangeText(start, end);
  return periodDays(start, end) === 7 ? copy.product.promo.week(range) : copy.product.promo.span(range);
}
