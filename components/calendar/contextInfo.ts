import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { t, tList } from "@/lib/labels";
import type { CalendarContext } from "@/types";

const X = copy.calendar.context;

export type ContextTag = { key: string; text: string; tone: "info" | "muted" };

export type DescribedContext = {
  /** Holidays and events (translated; several event names are joined). */
  tags: ContextTag[];
  weather: string;
  temp: string;
  rain: string | null;
  isForecast: boolean;
  scope: string;
};

/** Turns one backend context row into display text. `event_name` may hold several values separated by "|". */
export function describeContext(ctx: CalendarContext): DescribedContext {
  const tags: ContextTag[] = [];
  const holiday = ctx.is_holiday ? t("event", ctx.holiday_name) || X.holiday : "";
  const events = tList("event", ctx.event_name, ", ");
  if (holiday) tags.push({ key: "holiday", text: holiday, tone: "info" });
  if (events && events !== holiday) tags.push({ key: "event", text: events, tone: "info" });
  if (ctx.is_payday) tags.push({ key: "payday", text: X.payday, tone: "muted" });
  if (ctx.is_school_vacation) tags.push({ key: "school", text: X.schoolVacation, tone: "muted" });
  if (ctx.is_college_vacation) tags.push({ key: "college", text: X.collegeVacation, tone: "muted" });
  return {
    tags,
    weather: t("weather", ctx.weather_label),
    temp: X.temp(formatNumber(ctx.temp_max_c), formatNumber(ctx.temp_min_c)),
    rain: ctx.precipitation_mm > 0 ? X.rain(String(Math.round(ctx.precipitation_mm * 10) / 10)) : null,
    isForecast: ctx.is_forecast,
    scope: tList("eventScope", ctx.event_scope, ", "),
  };
}
