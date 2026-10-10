// Lazy loaders for the sample dataset in ./data (extracted from the backend generator by
// scripts/extract-sample-data.py). Raw shapes mirror the CSV/JSON files; mock handlers turn them into API shapes.

export type RawStore = {
  store_id: string; store_name: string; colonia: string; latitude: number; longitude: number;
  zone_type: string; secondary_zone_type: string | null; size_category: string; opening_hours: string;
  is_24h: number; opened_date: string;
};
export type RawZone = { zone_type: string; description: string; peak_hours: string; weekend_multiplier: number; notes: string };
export type RawCategory = {
  category_id: string; category_name: string; is_perishable: number; typical_shelf_life_days: number; requires_refrigeration: number;
};
export type RawProduct = {
  product_id: string; product_name: string; category_id: string; brand: string; unit: string; shelf_life_days: number;
  retail_price: number; is_seasonal: number; weather_sensitivity: string; base_daily_demand: number;
};
export type RawSupplier = {
  supplier_id: string; supplier_name: string; email: string; categories_served: string; city: string; reliability_score: number;
};
export type RawOffer = {
  supplier_id: string; product_id: string; unit_cost: number; min_order_qty: number; lead_time_days: number; delivery_days: string;
};
export type RawCampaign = {
  campaign_id: string; strategy_type: "affinity_combo" | "rescue_bundle" | "contextual_offer"; objective: string;
  anchor_product_id: string; promoted_product_id: string; discount_pct: number; uplift_anchor_pct: number;
  uplift_promoted_pct: number; start_date: string; end_date: string; trigger_reason: string; stores_treatment: number;
  stores_control: number; store_days: number; treatment_days: number; avg_units_treatment: number;
  avg_units_control: number; observed_lift_pct: number;
};
export type RawMeta = {
  data_as_of: string; history_start: string; history_end: string; forecast_start: string; forecast_end: string;
  sales_window_days: number; currency: string; source: string;
};
/** stock.json: rows are arrays following `columns`. */
export type RawStock = {
  asOf: string;
  columns: string[];
  rows: [string, string, number, number, number, string | null, string | null, number, number, number, number][];
};
export type RawSales = {
  start: string; end: string; days: number; storeIds: string[]; productIds: string[];
  series: Record<string, Record<string, number[]>>; // series[store][product] = units/day, oldest first
};
export type RawTicketScope = {
  tickets: number; averageTicket: number; itemsPerTicket: number;
  previous: { tickets: number; averageTicket: number; itemsPerTicket: number }; deltaPct: number;
};
export type RawTicketKpis = { asOf: string; scopes: Record<string, { last7: RawTicketScope; last30: RawTicketScope }> };
export type RawPair = { a: string; b: string; tickets: number; pctTickets: number; lift: number };
export type RawAffinity = { asOf: string; windowDays: number; tickets: number; chain: RawPair[]; byStore: Record<string, RawPair[]> };
export type RawCalendarRow = {
  date: string; day_of_week: string; is_weekend: number; is_holiday: number; holiday_name: string | null; season_name: string;
  event_name: string | null; event_scope: string | null; is_payday: number; is_school_vacation: number;
  is_college_vacation: number; demand_multiplier_hint: number | null; temp_max_c: number; temp_min_c: number;
  precipitation_mm: number; weather_label: string; kind: "history" | "forecast_context";
};

function once<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= load());
}

export const loadMeta = once(async () => (await import("./data/meta.json")).default as unknown as RawMeta);
export const loadStores = once(async () => (await import("./data/stores.json")).default as unknown as RawStore[]);
export const loadZones = once(async () => (await import("./data/zones.json")).default as unknown as RawZone[]);
export const loadCategories = once(async () => (await import("./data/categories.json")).default as unknown as RawCategory[]);
export const loadProducts = once(async () => (await import("./data/products.json")).default as unknown as RawProduct[]);
export const loadSuppliers = once(async () => (await import("./data/suppliers.json")).default as unknown as RawSupplier[]);
export const loadOffers = once(async () => (await import("./data/supplier_offers.json")).default as unknown as RawOffer[]);
export const loadCampaigns = once(async () => (await import("./data/campaigns.json")).default as unknown as RawCampaign[]);
export const loadStockRaw = once(async () => (await import("./data/stock.json")).default as unknown as RawStock);
export const loadSales = once(async () => (await import("./data/sales_daily.json")).default as unknown as RawSales);
export const loadTicketKpis = once(async () => (await import("./data/ticket_kpis.json")).default as unknown as RawTicketKpis);
export const loadAffinity = once(async () => (await import("./data/affinity.json")).default as unknown as RawAffinity);
export const loadCalendar = once(async () => (await import("./data/calendar.json")).default as unknown as { columns: string[]; rows: unknown[][] });

export type StockRow = {
  store_id: string; product_id: string; quantity: number; on_order_qty: number; open_orders: number;
  next_eta: string | null; earliest_expiry: string | null; predicted_daily_demand: number; reorder_point: number;
  avg_daily_units_14d: number; lost_demand_7d: number;
};

/** stock.json rows as objects (3000 rows: store × product). */
export const loadStock = once(async (): Promise<StockRow[]> => {
  const raw = await loadStockRaw();
  return raw.rows.map((r) => ({
    store_id: r[0], product_id: r[1], quantity: r[2], on_order_qty: r[3], open_orders: r[4], next_eta: r[5],
    earliest_expiry: r[6], predicted_daily_demand: r[7], reorder_point: r[8], avg_daily_units_14d: r[9], lost_demand_7d: r[10],
  }));
});

/** Calendar rows as objects (60 history days + 14 forecast_context days). */
export const loadCalendarRows = once(async (): Promise<RawCalendarRow[]> => {
  const raw = await loadCalendar();
  return raw.rows.map((r) => Object.fromEntries(raw.columns.map((c, i) => [c, r[i]])) as unknown as RawCalendarRow);
});

/** Frequently needed lookups. */
export const loadStoreMap = once(async () => new Map((await loadStores()).map((s) => [s.store_id, s])));
export const loadProductMap = once(async () => new Map((await loadProducts()).map((p) => [p.product_id, p])));
export const loadSupplierMap = once(async () => new Map((await loadSuppliers()).map((s) => [s.supplier_id, s])));
export const loadStockMap = once(async () => new Map((await loadStock()).map((r) => [`${r.store_id}|${r.product_id}`, r])));

/** Offers of one product sorted by the backend's best-supplier idea (cheaper first when ties) — mock only. */
export async function offersFor(productId: string): Promise<RawOffer[]> {
  return (await loadOffers()).filter((o) => o.product_id === productId);
}

/** Deterministic pseudo-random 0..1 from a string (stable mock numbers across reloads). */
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
