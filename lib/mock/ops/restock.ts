import type { RestockOrder, RestockReason, RestockSuggestion } from "@/types";
import { hash01, type RawOffer, type RawProduct, type StockRow } from "../db";
import { effectivePolicy, statusOf } from "../derive";
import { addDays, round2, type OpsData } from "./common";

// Mock of the backend's restock rules (dataset README: select_supplier). Everything here is deterministic.

export type Evaluation = { offer: RawOffer; qty: number; wasteUnits: number; score: number };
export type Selection = {
  chosen: Evaluation;
  /** Remaining offers of the product, fastest delivery first. */
  others: Evaluation[];
  /** No supplier delivers before the stock runs out. */
  urgent: boolean;
  demand: number;
  cycleDays: number;
};

const demandOf = (row: StockRow) => Math.max(row.predicted_daily_demand, 0.1);

/**
 * Best-supplier rule: drop suppliers whose lead time exceeds the stock coverage; if none is left take the
 * fastest one and flag the order as urgent. qty = max(min_order_qty, ceil(demand * (lead + cycle_days))),
 * cycle_days = min(7, shelf life). Score = ((price - cost) * (qty - waste) - cost * waste) * reliability.
 */
export function selectSupplier(d: OpsData, row: StockRow): Selection {
  const key = `${row.store_id}|${row.product_id}`;
  const hit = d.selections.get(key) as Selection | undefined;
  if (hit) return hit;
  const product = d.products.get(row.product_id);
  const offers = d.offers.get(row.product_id);
  if (!product || !offers?.length) throw new Error(`No supplier offers for ${row.product_id}`);
  const demand = demandOf(row);
  const coverage = row.quantity / demand;
  const cycleDays = Math.min(7, product.shelf_life_days);
  const evals: Evaluation[] = offers.map((offer) => {
    const qty = Math.max(offer.min_order_qty, Math.ceil(demand * (offer.lead_time_days + cycleDays)));
    const stockAtArrival = Math.max(0, row.quantity - demand * offer.lead_time_days);
    const wasteUnits = Math.round(Math.min(qty, Math.max(0, stockAtArrival + qty - demand * product.shelf_life_days)));
    const reliability = d.suppliers.get(offer.supplier_id)?.reliability_score ?? 0.8;
    const margin = (product.retail_price - offer.unit_cost) * (qty - wasteUnits) - offer.unit_cost * wasteUnits;
    return { offer, qty, wasteUnits, score: margin * reliability };
  });
  const byId = (a: Evaluation, b: Evaluation) => a.offer.supplier_id.localeCompare(b.offer.supplier_id);
  const eligible = evals.filter((e) => e.offer.lead_time_days <= coverage);
  const urgent = eligible.length === 0;
  const chosen = urgent
    ? [...evals].sort((a, b) => a.offer.lead_time_days - b.offer.lead_time_days || b.score - a.score || byId(a, b))[0]
    : [...eligible].sort((a, b) => b.score - a.score || a.offer.lead_time_days - b.offer.lead_time_days || byId(a, b))[0];
  const others = evals
    .filter((e) => e !== chosen)
    .sort((a, b) => a.offer.lead_time_days - b.offer.lead_time_days || a.offer.unit_cost - b.offer.unit_cost || byId(a, b));
  const sel: Selection = { chosen, others, urgent, demand, cycleDays };
  d.selections.set(key, sel);
  return sel;
}

/** Approximate units that expire within 7 days of data_as_of (the dataset only has the earliest expiry date). */
export function expiringQty7d(d: OpsData, row: StockRow): number {
  if (!row.earliest_expiry || row.quantity <= 0 || row.earliest_expiry > addDays(d.asOf, 7)) return 0;
  const shelf = d.products.get(row.product_id)?.shelf_life_days ?? 30;
  const h = hash01(`exp|${row.store_id}|${row.product_id}`);
  const fraction = shelf <= 7 ? 0.5 + 0.5 * h : 0.1 + 0.4 * h;
  return Math.max(1, Math.min(row.quantity, Math.round(row.quantity * fraction)));
}

/** Is the open order late? (next_eta is before data_as_of). */
export const isDelayed = (d: OpsData, row: StockRow) => row.open_orders > 0 && !!row.next_eta && row.next_eta < d.asOf;

/** Earliest on-time arrival (dataset order or an order sent in this session). */
export function nextArrival(d: OpsData, row: StockRow, sent: RestockOrder[] = []): string | null {
  const dates = sent.map((o) => o.expected_delivery_date);
  if (row.open_orders > 0 && row.next_eta && row.next_eta >= d.asOf) dates.push(row.next_eta);
  return dates.length ? dates.sort()[0] : null;
}

/** Date the stock runs out (data_as_of + floor(coverage)). */
export const runOutDate = (d: OpsData, row: StockRow) => addDays(d.asOf, Math.floor(row.quantity / demandOf(row)));

/** True when a stock-out is coming (out, or coverage shorter than the lead time) and nothing arrives in time. */
export function stockoutRisk(d: OpsData, row: StockRow, sent: RestockOrder[] = []): boolean {
  const status = statusOf(row.quantity, effectivePolicy(row));
  if (status === "out") return true;
  if (status !== "low") return false;
  const lead = selectSupplier(d, row).chosen.offer.lead_time_days;
  if (row.quantity / demandOf(row) >= lead) return false;
  const arrival = nextArrival(d, row, sent);
  return !(arrival && arrival <= runOutDate(d, row));
}

/** Reasons a product needs restock; an empty array means it is not a candidate. */
export function restockReasons(d: OpsData, row: StockRow): RestockReason[] {
  const product = d.products.get(row.product_id);
  if (!product) return [];
  // Seasonal items out of their selling window (≈ no expected demand) are never ordered (generator rule: demand ≥ 0.05/day).
  if (row.predicted_daily_demand < 0.05) return [];
  // The dataset's predicted demand ignores the selling window of seasonal items (e.g. Three Kings' cake predicts 5.9/day
  // in September while it sells 0): without recent sales an out-of-season product is not a restock candidate.
  if (product.is_seasonal === 1 && row.avg_daily_units_14d === 0) return [];
  const status = statusOf(row.quantity, effectivePolicy(row));
  const sel = selectSupplier(d, row);
  const lead = sel.chosen.offer.lead_time_days;
  const coverage = row.quantity / sel.demand;
  const arrival = nextArrival(d, row);
  const covered = status !== "out" && !!arrival && arrival <= runOutDate(d, row);
  const spike = row.avg_daily_units_14d > 0 && row.predicted_daily_demand >= 1 && row.predicted_daily_demand / row.avg_daily_units_14d >= 1.3;
  const expiring = expiringQty7d(d, row);

  const reasons: RestockReason[] = [];
  if (status === "out") reasons.push("stockout");
  else if (status === "low" && !covered) reasons.push("below_min");
  if (spike && status !== "over" && (reasons.length > 0 || (!covered && coverage < lead + sel.cycleDays))) reasons.push("demand_spike");
  if (reasons.length > 0) {
    if (expiring > 0) reasons.push("expiry");
  } else if (expiring >= row.quantity * 0.6 && expiring > 0 && (row.quantity - expiring) / sel.demand < lead) {
    reasons.push("expiry");
  }
  if (reasons.length > 0 && product.is_seasonal === 1) reasons.push("season");
  return reasons;
}

export const suggestionId = (storeId: string, productId: string, orderDate: string) => `rs_${storeId}_${productId}_${orderDate.replaceAll("-", "")}`;

export function parseSuggestionId(id: string): { storeId: string; productId: string; date: string } | null {
  const m = /^rs_([^_]+)_([^_]+)_(\d{4})(\d{2})(\d{2})$/.exec(id);
  return m ? { storeId: m[1], productId: m[2], date: `${m[3]}-${m[4]}-${m[5]}` } : null;
}

function offerView(d: OpsData, e: Evaluation, orderDate: string) {
  return {
    supplier_id: e.offer.supplier_id,
    supplier_name: d.suppliers.get(e.offer.supplier_id)?.supplier_name ?? e.offer.supplier_id,
    unit_cost: e.offer.unit_cost,
    min_order_qty: e.offer.min_order_qty,
    lead_time_days: e.offer.lead_time_days,
    expected_delivery_date: addDays(orderDate, e.offer.lead_time_days),
    suggested_qty: e.qty,
    estimated_cost: round2(e.qty * e.offer.unit_cost),
  };
}

export function buildSuggestion(d: OpsData, row: StockRow, reasons: RestockReason[], sent: RestockOrder[], orderDate = d.asOf): RestockSuggestion {
  const product = d.products.get(row.product_id) as RawProduct;
  const sel = selectSupplier(d, row);
  const { chosen } = sel;
  const supplier = d.suppliers.get(chosen.offer.supplier_id);
  const reliability = supplier?.reliability_score ?? 0.8;
  const id = suggestionId(row.store_id, row.product_id, orderDate);

  // Plausible impact: lost units = demand over the horizon the order would cover minus what is already coming.
  const horizon = chosen.offer.lead_time_days + sel.cycleDays;
  const arrival = nextArrival(d, row);
  const inbound = arrival && arrival <= addDays(orderDate, horizon) ? row.on_order_qty : 0;
  const lostUnits = Math.max(0, sel.demand * horizon - row.quantity - inbound);
  const recovered = Math.min(chosen.qty - chosen.wasteUnits, lostUnits) * reliability;
  const wasteCost = chosen.wasteUnits * chosen.offer.unit_cost;

  return {
    id,
    store_id: row.store_id,
    product_id: row.product_id,
    order_date: orderDate,
    expected_delivery_date: addDays(orderDate, chosen.offer.lead_time_days),
    is_urgent: sel.urgent,
    reasons,
    suggested_qty: chosen.qty,
    estimated_cost: round2(chosen.qty * chosen.offer.unit_cost),
    stock_at_order: row.quantity,
    predicted_daily_demand: row.predicted_daily_demand,
    supplier: {
      supplier_id: chosen.offer.supplier_id,
      supplier_name: supplier?.supplier_name ?? chosen.offer.supplier_id,
      email: supplier?.email ?? "",
      unit_cost: chosen.offer.unit_cost,
      min_order_qty: chosen.offer.min_order_qty,
      lead_time_days: chosen.offer.lead_time_days,
      delivery_days: chosen.offer.delivery_days,
      reliability_score: reliability,
    },
    alternatives: sel.others.map((e) => offerView(d, e, orderDate)),
    expected_lost_sales_if_skipped: round2(lostUnits * product.retail_price),
    expected_gain_if_ordered: round2(Math.max(0, recovered * (product.retail_price - chosen.offer.unit_cost) - wasteCost)),
    expected_waste_if_ordered: round2(wasteCost),
    order_status: sent.some((o) => o.suggestion_id === id) ? "sent" : "pending",
  };
}

/** Candidate suggestions of a set of rows, biggest lost sales first. */
export function suggestionsFor(d: OpsData, rows: StockRow[], sentByKey: Map<string, RestockOrder[]>): RestockSuggestion[] {
  const out: RestockSuggestion[] = [];
  for (const row of rows) {
    const reasons = restockReasons(d, row);
    if (reasons.length === 0) continue;
    out.push(buildSuggestion(d, row, reasons, sentByKey.get(`${row.store_id}|${row.product_id}`) ?? []));
  }
  return out.sort((a, b) => b.expected_lost_sales_if_skipped - a.expected_lost_sales_if_skipped || a.id.localeCompare(b.id));
}
