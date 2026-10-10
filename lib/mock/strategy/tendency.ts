import type { Strategy, Tendency } from "@/types";
import { hash01 } from "../db";
import { MockHttpError } from "../errors";
import { loadCtx, type Ctx } from "./context";
import { dayFactor } from "./engine";
import { allStrategies } from "./plan";
import { isLive } from "./portfolio";
import { addDays, clamp, dm, n1, pct0, r1, weekdayEn } from "./util";

// Mock of GET /stores/{id}/tendency: real history (sales_daily.json) + a simulated forecast with P50/P80/P90.
// The forecast is anchored on the model's predicted_daily_demand (the same one restock uses) and shaped by the
// weekday profile of the store, the calendar/weather of forecast_context and the recent trend.

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Units per day, oldest first, ending at data_as_of. Longer than the 44 real days → deterministic extension backwards. */
function historySeries(ctx: Ctx, storeId: string, productId: string, days: number): { date: string; value: number }[] {
  const real = ctx.sales.series[storeId]?.[productId] ?? [];
  const start = ctx.sales.start;
  const out: { date: string; value: number }[] = real.map((v, i) => ({ date: addDays(start, i), value: v }));
  if (days > out.length) {
    const store = ctx.storeById.get(storeId)!;
    const p = ctx.productById.get(productId)!;
    const level = mean(real.slice(0, 7)) || mean(real) || 0.5;
    const missing = days - out.length;
    const ext: { date: string; value: number }[] = [];
    for (let k = 1; k <= missing; k++) {
      const date = addDays(start, -k);
      const noise = 0.85 + 0.3 * hash01(`${storeId}|${productId}|${date}|hist`);
      ext.push({ date, value: Math.max(0, Math.round(level * dayFactor(ctx, store, p, date) * noise)) });
    }
    return [...ext.reverse(), ...out];
  }
  return out.slice(out.length - days);
}

/** Relative weight of each weekday in the real history (shrunk towards 1). */
function weekdayProfile(series: { date: string; value: number }[]): number[] {
  const sums = new Array<number>(7).fill(0);
  const cnt = new Array<number>(7).fill(0);
  for (const pt of series) {
    const dow = DOW.indexOf(weekdayEn(pt.date));
    sums[dow] += pt.value;
    cnt[dow]++;
  }
  const overall = mean(series.map((s) => s.value)) || 1;
  return sums.map((s, i) => (cnt[i] ? 1 + 0.6 * (s / cnt[i] / overall - 1) : 1));
}

export function liveStrategyFor(all: Strategy[], productId: string): Strategy | undefined {
  return all.filter((s) => isLive(s.status) && s.promoted_product_id === productId).sort((a, b) => b.expected_margin_increment - a.expected_margin_increment)[0];
}

export async function buildTendency(storeId: string, productId: string, historyDays: number, forecastDays: number): Promise<Tendency> {
  const ctx = await loadCtx();
  const store = ctx.storeById.get(storeId);
  if (!store) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${storeId}`);
  const p = ctx.productById.get(productId);
  const row = ctx.stockByKey.get(`${storeId}|${productId}`);
  if (!p || !row) throw new MockHttpError(404, "product_not_found", `Producto desconocido en la tienda: ${productId}`);

  const hd = clamp(Math.round(historyDays) || 30, 1, 180);
  const fd = clamp(Math.round(forecastDays) || 14, 1, 30);
  const real = historySeries(ctx, storeId, productId, 44);
  const history = historySeries(ctx, storeId, productId, hd);
  const wd = weekdayProfile(real);

  // Level and recent trend.
  const last7 = mean(real.slice(-7).map((x) => x.value));
  const prev7 = mean(real.slice(-14, -7).map((x) => x.value));
  const trendRatio = prev7 > 0 ? clamp(last7 / prev7, 0.8, 1.25) : 1;
  const level = Math.max(0.1, row.predicted_daily_demand);
  const cv = clamp(
    (() => {
      const xs = real.slice(-28).map((x) => x.value);
      const m = mean(xs);
      return m > 0 ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m : 0.3;
    })(),
    0.1, 0.4,
  );

  const dates = Array.from({ length: fd }, (_, i) => addDays(ctx.asOf, i + 1));
  const drivers = new Set<string>();
  let missingCtx = 0;
  const forecast = dates.map((date, i) => {
    const calRow = ctx.calendar.get(date);
    if (!calRow) missingCtx++;
    const dow = DOW.indexOf(weekdayEn(date));
    // dayFactor already carries weekend (zone), payday, calendar hint and weather; the store's own weekday profile refines it.
    const f = dayFactor(ctx, store, p, date);
    const trend = 1 + (trendRatio - 1) * 0.5 * Math.min(1, (i + 1) / 7);
    const p50 = Math.max(0, level * f * (0.5 + 0.5 * wd[dow]) * trend);
    const sigma = cv * (0.7 + 0.03 * (i + 1));
    if (calRow) {
      if (calRow.is_weekend) drivers.add("weekend");
      if (calRow.is_payday) drivers.add("payday");
      if (calRow.event_name) drivers.add("event");
      if (p.weather_sensitivity === "hot" && calRow.temp_max_c >= 25) drivers.add("hot_weather");
      if (p.weather_sensitivity === "cold" && calRow.temp_min_c <= 15) drivers.add("cold_weather");
    } else if ([0, 6].includes(dow)) drivers.add("weekend");
    return { date, value: r1(p50), p50: r1(p50), p80: r1(p50 * (1 + 0.84 * sigma)), p90: r1(p50 * (1 + 1.28 * sigma)) };
  });
  if (trendRatio > 1.05) drivers.add("recent_trend_up");
  if (trendRatio < 0.95) drivers.add("recent_trend_down");

  // Promotion in the plan → treated series.
  const { all } = await allStrategies(storeId);
  const promo = liveStrategyFor(all, productId);
  let treated: Tendency["treated"] = null;
  if (promo) {
    const ratio = clamp(promo.baseline.units > 0 ? promo.treated.units / promo.baseline.units : 1, 1, 1.8);
    treated = forecast.map((pt) => ({
      date: pt.date,
      value: pt.date >= promo.period.start_date && pt.date <= promo.period.end_date ? r1(pt.value * ratio) : pt.value,
    }));
    drivers.add("promotion");
  }

  // Risks.
  const risks: Tendency["risks"] = [];
  const inbound = row.next_eta && row.next_eta <= dates[Math.min(dates.length, 7) - 1] ? row.on_order_qty : 0;
  const demand7 = forecast.slice(0, 7).reduce((s, x) => s + x.p50, 0);
  if (row.quantity + inbound < demand7)
    risks.push({
      code: "stockout_risk",
      message: `El stock disponible (${n1(row.quantity + inbound)} u) no cubre la demanda pronosticada de los próximos ${Math.min(7, fd)} días (${n1(demand7)} u).`,
    });
  if (row.earliest_expiry) {
    const dE = Math.round((Date.parse(row.earliest_expiry) - Date.parse(ctx.asOf)) / 86_400_000);
    if (dE > 0 && dE <= 21 && row.quantity > level * dE)
      risks.push({
        code: "expiry_risk",
        message: `Caduca el ${dm(row.earliest_expiry)} y con la demanda pronosticada sobrarían ${n1(row.quantity - level * dE)} piezas.`,
      });
  }
  if (cv > 0.3) risks.push({ code: "low_confidence", message: "Ventas muy variables en los últimos días: el rango del pronóstico es amplio." });
  if (missingCtx > 0)
    risks.push({ code: "forecast_context_missing", message: `Sin calendario ni clima para ${missingCtx} de los ${fd} días; el pronóstico usa solo el patrón semanal.` });

  const total = forecast.reduce((s, x) => s + x.p50, 0);
  const avg = total / fd;
  const hist14 = mean(real.slice(-14).map((x) => x.value));
  const dirTxt = avg > hist14 * 1.05 ? "por encima de" : avg < hist14 * 0.95 ? "por debajo de" : "en línea con";
  const dTxt = [
    drivers.has("weekend") ? "el fin de semana" : null,
    drivers.has("payday") ? "la quincena" : null,
    drivers.has("event") ? "eventos del calendario" : null,
    drivers.has("hot_weather") ? "el calor previsto" : null,
    drivers.has("cold_weather") ? "el frío previsto" : null,
  ].filter(Boolean);
  const peak = forecast.reduce((m, x) => (x.p50 > m.p50 ? x : m), forecast[0]);
  let summary =
    `Se esperan ${n1(avg)} unidades al día en los próximos ${fd} días (${n1(total)} en total; rango P50–P90 por día: ${n1(avg)}–${n1(mean(forecast.map((x) => x.p90)))}), ${dirTxt} los ${n1(hist14)} u/día de las últimas dos semanas. ` +
    `El día más fuerte es el ${dm(peak.date)} (${n1(peak.p50)} u)` +
    (dTxt.length ? `, empujado por ${dTxt.join(", ")}.` : ".");
  if (promo)
    summary += ` La promoción «${promo.title}» (${pct0(promo.proposed_discount_pct)} de descuento, ${dm(promo.period.start_date)} al ${dm(promo.period.end_date)}) está en el plan y se muestra como serie tratada.`;
  if (risks.length) summary += ` Atención: ${risks[0].message}`;

  return {
    store_id: storeId,
    product_id: productId,
    history,
    forecast,
    treated,
    drivers: [...drivers],
    risks,
    ai_summary: summary,
  };
}

