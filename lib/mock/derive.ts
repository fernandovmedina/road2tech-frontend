import type { StockStatus } from "@/types";
import { getState } from "./store";
import { loadProductMap, loadStock, type RawProduct, type StockRow } from "./db";

// Shared mock derivations (the "backend rules"). Stock rows come from the generator; max_stock is not in the
// dataset, so the mock defines it from the reorder point and demand. The real backend owns these rules.

export type Policy = { reorder_point: number; max_stock: number };

/** reorder_point comes from the dataset; max_stock = cover for ~3 reorder cycles (mock rule). */
export function defaultPolicy(row: StockRow): Policy {
  const rp = Math.max(1, row.reorder_point);
  return { reorder_point: rp, max_stock: Math.max(rp * 3, Math.ceil(row.predicted_daily_demand * 14)) };
}

/** Policy including edits made in this session (PUT /stock-policy). */
export function effectivePolicy(row: StockRow): Policy {
  const edited = getState().policies[`${row.store_id}|${row.product_id}`];
  return edited ? { reorder_point: edited.reorder_point, max_stock: edited.max_stock } : defaultPolicy(row);
}

export function statusOf(qty: number, p: Policy): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= p.reorder_point) return "low";
  if (qty > p.max_stock) return "over";
  return "ok";
}

export const coverageDays = (qty: number, dailyDemand: number) => Math.round((qty / Math.max(dailyDemand, 0.1)) * 10) / 10;

/** Status per store×product for the whole chain (3000 rows). */
export async function allStatuses(): Promise<{ row: StockRow; status: StockStatus; policy: Policy }[]> {
  const rows = await loadStock();
  return rows.map((row) => {
    const policy = effectivePolicy(row);
    return { row, status: statusOf(row.quantity, policy), policy };
  });
}

export async function productOf(productId: string): Promise<RawProduct | undefined> {
  return (await loadProductMap()).get(productId);
}
