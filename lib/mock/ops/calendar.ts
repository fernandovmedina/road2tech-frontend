import type { Calendar, CalendarContext, CalendarEvent, RestockOrder } from "@/types";
import { loadCalendarRows, type StockRow } from "../db";
import { addDays, diffDays, openOrderId, type OpsData } from "./common";
import { expiringQty7d, isDelayed, runOutDate, selectSupplier, stockoutRisk } from "./restock";
import { getStorePlan } from "../handlers/strategy";

// Mock of GET /stores/:id/calendar. Events come from the same stock rows as the stock and restock screens.

export type Layer = "deliveries" | "strategies" | "alerts" | "context";
const ALL_LAYERS: Layer[] = ["deliveries", "strategies", "alerts", "context"];

export function parseLayers(raw: string | undefined): Set<Layer> {
  if (!raw) return new Set(ALL_LAYERS);
  const wanted = raw.split(",").map((s) => s.trim());
  return new Set(ALL_LAYERS.filter((l) => wanted.includes(l)));
}

const KIND_ORDER: Record<CalendarEvent["kind"], number> = { alert: 0, delivery: 1, strategy: 2 };
const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

function deliveryEvents(d: OpsData, rows: StockRow[], sent: Map<string, RestockOrder[]>, from: string, to: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const row of rows) {
    if (row.open_orders > 0 && row.next_eta && !isDelayed(d, row) && inRange(row.next_eta, from, to)) {
      const orderId = openOrderId(row);
      out.push({
        id: `ev_dlv_${orderId}`, date: row.next_eta, kind: "delivery", label_code: "delivery", product_id: row.product_id,
        supplier_id: selectSupplier(d, row).chosen.offer.supplier_id, order_id: orderId, qty: row.on_order_qty,
      });
    }
    for (const o of sent.get(`${row.store_id}|${row.product_id}`) ?? []) {
      if (!inRange(o.expected_delivery_date, from, to)) continue;
      out.push({
        id: `ev_dlv_${o.order_id}`, date: o.expected_delivery_date, kind: "delivery", label_code: "delivery",
        product_id: o.product_id, supplier_id: o.supplier_id, order_id: o.order_id, qty: o.qty,
      });
    }
  }
  return out;
}

function alertEvents(d: OpsData, rows: StockRow[], sent: Map<string, RestockOrder[]>, from: string, to: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const row of rows) {
    const mine = sent.get(`${row.store_id}|${row.product_id}`) ?? [];
    if (stockoutRisk(d, row, mine)) {
      const date = row.quantity <= 0 ? d.asOf : runOutDate(d, row);
      if (inRange(date, from, to)) {
        const coverage = row.quantity / Math.max(row.predicted_daily_demand, 0.1);
        out.push({
          id: `ev_risk_${row.product_id}`, date, kind: "alert", alert_type: "stockout_risk", product_id: row.product_id,
          severity: row.quantity <= 0 || coverage < 1 ? "high" : "medium",
        });
      }
    }
    const expiring = expiringQty7d(d, row);
    if (expiring > 0 && row.earliest_expiry) {
      const date = row.earliest_expiry < d.asOf ? d.asOf : row.earliest_expiry;
      if (inRange(date, from, to)) {
        out.push({ id: `ev_exp_${row.product_id}`, date, kind: "alert", alert_type: "expiring_soon", product_id: row.product_id, qty: expiring, severity: diffDays(d.asOf, date) <= 2 ? "high" : "medium" });
      }
    }
    if (isDelayed(d, row) && row.next_eta) {
      const date = addDays(row.next_eta, 1);
      if (inRange(date, from, to)) {
        out.push({
          id: `ev_late_${openOrderId(row)}`, date, kind: "alert", alert_type: "order_delayed", product_id: row.product_id,
          order_id: openOrderId(row), expected_delivery_date: row.next_eta, delay_days: diffDays(row.next_eta, d.asOf), severity: "medium",
        });
      }
    }
  }
  return out;
}

async function strategyEvents(storeId: string, from: string, to: string): Promise<CalendarEvent[]> {
  try {
    const plan = await getStorePlan(storeId);
    return plan.strategies
      .filter((s) => s.status !== "rejected" && s.period.start_date <= to && s.period.end_date >= from)
      .map((s) => ({
        id: `ev_str_${s.draft_id}`, date: s.period.start_date < from ? from : s.period.start_date, kind: "strategy" as const,
        strategy_id: s.draft_id, status: s.status, strategy_type: s.strategy_type, start_date: s.period.start_date, end_date: s.period.end_date,
      }));
  } catch (e) {
    console.warn("calendar mock: strategy layer unavailable", e);
    return [];
  }
}

async function contextRows(from: string, to: string): Promise<CalendarContext[]> {
  return (await loadCalendarRows())
    .filter((r) => inRange(r.date, from, to))
    .map((r) => ({
      date: r.date, day_of_week: r.day_of_week, is_holiday: r.is_holiday, holiday_name: r.holiday_name, event_name: r.event_name,
      event_scope: r.event_scope, is_payday: r.is_payday, is_school_vacation: r.is_school_vacation, is_college_vacation: r.is_college_vacation,
      temp_max_c: r.temp_max_c, temp_min_c: r.temp_min_c, precipitation_mm: r.precipitation_mm, weather_label: r.weather_label,
      is_forecast: r.kind === "forecast_context",
    }));
}

export async function buildCalendar(
  d: OpsData, storeId: string, rows: StockRow[], sent: Map<string, RestockOrder[]>,
  query: Record<string, string>, empty: boolean,
): Promise<Calendar> {
  const from = query.from || d.asOf;
  const to = query.to || addDays(from, 30);
  if (empty) return { store_id: storeId, from, to, events: [], context: [] };
  const layers = parseLayers(query.layers);
  const events: CalendarEvent[] = [];
  if (layers.has("deliveries")) events.push(...deliveryEvents(d, rows, sent, from, to));
  if (layers.has("alerts")) events.push(...alertEvents(d, rows, sent, from, to));
  if (layers.has("strategies")) events.push(...(await strategyEvents(storeId, from, to)));
  events.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id));
  return { store_id: storeId, from, to, events, context: layers.has("context") ? await contextRows(from, to) : [] };
}
