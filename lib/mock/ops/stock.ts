import type { PolicyItem, PolicySuggestion, RestockOrder, StockItem, StockStatus, StockSummary } from "@/types";
import type { StockRow } from "../db";
import { coverageDays, effectivePolicy, statusOf } from "../derive";
import { getState } from "../store";
import { fmt1, normalize, openOrderId, paginate, type OpsData } from "./common";
import { expiringQty7d, isDelayed, selectSupplier } from "./restock";

// Mock of GET /stores/:id/stock, GET /stock/summary and the stock-policy endpoints.

export type StockFilters = { categoryId?: string; q?: string; status?: string };

/** Rows that pass category / name filters (status is applied by the caller, summary ignores it). */
export function filterRows(d: OpsData, rows: StockRow[], f: StockFilters): StockRow[] {
  const q = f.q ? normalize(f.q) : "";
  if (!f.categoryId && !q) return rows;
  return rows.filter((r) => {
    if (f.categoryId && d.products.get(r.product_id)?.category_id !== f.categoryId) return false;
    return !q || (d.names.get(r.product_id) ?? "").includes(q);
  });
}

export function summarize(rows: StockRow[]): StockSummary {
  const s: StockSummary = { total: rows.length, out: 0, low: 0, ok: 0, over: 0 };
  for (const r of rows) s[statusOf(r.quantity, effectivePolicy(r))] += 1;
  return s;
}

const isStatus = (v: string | undefined): v is StockStatus => v === "out" || v === "low" || v === "ok" || v === "over";

export function toStockItem(d: OpsData, row: StockRow, sent: RestockOrder[]): StockItem {
  const product = d.products.get(row.product_id);
  const policy = effectivePolicy(row);
  const inTransit: StockItem["in_transit"] = [];
  let onOrder = row.on_order_qty;
  let nextRestock = row.next_eta;
  if (row.open_orders > 0 && row.next_eta) {
    inTransit.push({
      order_id: openOrderId(row),
      quantity: row.on_order_qty,
      supplier_id: selectSupplier(d, row).chosen.offer.supplier_id,
      expected_delivery_date: row.next_eta,
      is_delayed: isDelayed(d, row),
    });
  }
  for (const o of sent) {
    inTransit.push({ order_id: o.order_id, quantity: o.qty, supplier_id: o.supplier_id, expected_delivery_date: o.expected_delivery_date, is_delayed: false });
    onOrder += o.qty;
    if (!nextRestock || o.expected_delivery_date < nextRestock) nextRestock = o.expected_delivery_date;
  }
  return {
    store_id: row.store_id,
    product_id: row.product_id,
    product_name: product?.product_name ?? row.product_id,
    category_id: product?.category_id ?? "",
    closing_qty: row.quantity,
    on_order_qty: onOrder,
    in_transit: inTransit,
    reorder_point: policy.reorder_point,
    max_stock: policy.max_stock,
    coverage_days: coverageDays(row.quantity, row.predicted_daily_demand),
    status: statusOf(row.quantity, policy),
    earliest_expiry: row.earliest_expiry,
    expiring_qty_7d: expiringQty7d(d, row),
    expected_waste_units: expectedWasteUnits(row, d.asOf),
    lost_demand_7d: row.lost_demand_7d,
    next_restock_date: nextRestock,
  };
}

export function stockPage(d: OpsData, rows: StockRow[], query: Record<string, string>, sent: Map<string, RestockOrder[]>) {
  let list = filterRows(d, rows, { categoryId: query.category_id, q: query.q });
  if (isStatus(query.status)) list = list.filter((r) => statusOf(r.quantity, effectivePolicy(r)) === query.status);
  const name = (r: StockRow) => d.products.get(r.product_id)?.product_name ?? "";
  const cov = (r: StockRow) => r.quantity / Math.max(r.predicted_daily_demand, 0.1);
  const tie = (a: StockRow, b: StockRow) => a.store_id.localeCompare(b.store_id) || a.product_id.localeCompare(b.product_id);
  const sorted = [...list].sort(
    query.sort === "product_name"
      ? (a, b) => name(a).localeCompare(name(b), "es") || tie(a, b)
      : query.sort === "quantity"
        ? (a, b) => a.quantity - b.quantity || tie(a, b)
        : (a, b) => cov(a) - cov(b) || tie(a, b),
  );
  const page = paginate(sorted, query);
  return { ...page, items: page.items.map((r) => toStockItem(d, r, sent.get(`${r.store_id}|${r.product_id}`) ?? [])) };
}

/* ---------- stock policy ---------- */

export function toPolicyItem(d: OpsData, row: StockRow): PolicyItem {
  const product = d.products.get(row.product_id);
  const offer = selectSupplier(d, row).chosen.offer;
  const policy = effectivePolicy(row);
  return {
    product_id: row.product_id,
    product_name: product?.product_name ?? row.product_id,
    category_id: product?.category_id ?? "",
    unit_cost: offer.unit_cost,
    retail_price: product?.retail_price ?? 0,
    min_order_qty: offer.min_order_qty,
    shelf_life_days: product?.shelf_life_days ?? 0,
    reorder_point: policy.reorder_point,
    max_stock: policy.max_stock,
    updated_at: getState().policies[`${row.store_id}|${row.product_id}`]?.updated_at ?? null,
  };
}

export function policyPage(d: OpsData, storeId: string, rows: StockRow[], query: Record<string, string>) {
  const list = filterRows(d, rows, { categoryId: query.category_id, q: query.q });
  const page = paginate(list, query);
  return { store_id: storeId, ...page, items: page.items.map((r) => toPolicyItem(d, r)) };
}

export type PolicyInput = { product_id: string; reorder_point: number; max_stock: number };

/** Returns one error per invalid item; empty when the batch can be saved. */
export function validatePolicy(d: OpsData, storeId: string, body: unknown): { items: PolicyInput[]; errors: string[] } {
  const raw = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(raw) || raw.length === 0) return { items: [], errors: ["items: se requiere al menos un producto"] };
  const items: PolicyInput[] = [];
  const errors: string[] = [];
  for (const entry of raw as Record<string, unknown>[]) {
    const id = String(entry?.product_id ?? "?");
    const min = entry?.reorder_point;
    const max = entry?.max_stock;
    if (!d.rowByKey.has(`${storeId}|${id}`)) errors.push(`${id}: producto desconocido en la tienda`);
    else if (!Number.isInteger(min) || !Number.isInteger(max)) errors.push(`${id}: mínimo y máximo deben ser enteros`);
    else if ((min as number) < 0 || (min as number) > (max as number)) errors.push(`${id}: se requiere 0 ≤ mínimo ≤ máximo`);
    else items.push({ product_id: id, reorder_point: min as number, max_stock: max as number });
  }
  return { items, errors };
}

/**
 * Suggested policy (mock rule): reorder_point = ceil(demand * (median lead time + safety days)), safety = 1 day if
 * shelf life <= 30 else 3 (same policy as the generator, but with the higher of forecast and 14-day demand);
 * max_stock = reorder_point + one cycle (min(7, shelf life) days) of demand, capped at 80 % of the shelf-life demand.
 */
export function suggestPolicy(d: OpsData, row: StockRow): PolicySuggestion["items"][number] {
  const product = d.products.get(row.product_id);
  const shelf = product?.shelf_life_days ?? 30;
  const leads = (d.offers.get(row.product_id) ?? []).map((o) => o.lead_time_days).sort((a, b) => a - b);
  const lead = leads.length ? leads[Math.floor((leads.length - 1) / 2)] : 3;
  const safety = shelf <= 30 ? 1 : 3;
  const demand = Math.max(row.predicted_daily_demand, row.avg_daily_units_14d, 0.1);
  const cycle = Math.min(7, shelf);
  const reorderPoint = Math.max(1, Math.ceil(demand * (lead + safety)));
  const shelfCap = Math.ceil(demand * shelf * 0.8);
  const maxStock = Math.max(reorderPoint + 1, Math.min(reorderPoint + Math.ceil(demand * cycle), Math.max(shelfCap, reorderPoint + 1)));
  const current = effectivePolicy(row);
  const trend = row.avg_daily_units_14d > row.predicted_daily_demand * 1.1 ? " (demanda reciente al alza)" : "";
  const capNote = maxStock < reorderPoint + Math.ceil(demand * cycle) ? `; máximo limitado por vida útil de ${shelf} días` : `; máximo cubre un ciclo de ${cycle} días`;
  return {
    product_id: row.product_id,
    current: { reorder_point: current.reorder_point, max_stock: current.max_stock },
    suggested: { reorder_point: reorderPoint, max_stock: maxStock },
    reason: `Demanda de ${fmt1(demand)} u/día${trend}, lead time típico de ${lead} días y reserva de ${safety} ${safety === 1 ? "día" : "días"}: mínimo ${reorderPoint} u${capNote}.`,
  };
}

/** Units that will expire unsold: stock beyond what the expected demand sells before the earliest expiry (0 when far away). */
function expectedWasteUnits(row: StockRow, asOf: string): number {
  if (!row.earliest_expiry || row.quantity <= 0) return 0;
  const daysLeft = Math.round((Date.parse(`${row.earliest_expiry}T12:00:00`) - Date.parse(`${asOf}T12:00:00`)) / 86_400_000);
  if (daysLeft < 0 || daysLeft > 14) return 0;
  return Math.max(0, Math.floor(row.quantity - row.predicted_daily_demand * Math.max(daysLeft, 1)));
}
