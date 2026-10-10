import { loadMeta, loadOffers, loadProducts, loadStock, loadStores, loadSuppliers, type RawOffer, type RawProduct, type RawStore, type RawSupplier, type StockRow } from "../db";
import { getState } from "../store";
import { restockOrderSchema } from "@/lib/api/schemas";
import type { RestockOrder } from "@/types";

// Shared helpers of the stock / restock / calendar mock handlers (lib/mock/handlers/ops.ts).

const DAY_MS = 86_400_000;

export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
/** Whole days from `a` to `b` (b - a). */
export const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
export const round2 = (n: number) => Math.round(n * 100) / 100;
/** The mock's "now": data_as_of date with the real time of day, so timestamps agree with the fictional calendar. */
export const nowIso = (asOf: string) => `${asOf}T${new Date().toISOString().slice(11, 19)}Z`;

/** Lowercase + strip accents so `q` filters match "Jalapeño" with "jalapeno". */
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const fmt1 = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

export function paginate<T>(all: T[], query: Record<string, string>): { items: T[]; page: number; page_size: number; total: number } {
  const size = Math.min(100, Math.max(1, Math.trunc(Number(query.page_size)) || 25));
  const page = Math.max(1, Math.trunc(Number(query.page)) || 1);
  return { items: all.slice((page - 1) * size, page * size), page, page_size: size, total: all.length };
}

export type OpsData = {
  asOf: string;
  stores: Map<string, RawStore>;
  products: Map<string, RawProduct>;
  suppliers: Map<string, RawSupplier>;
  offers: Map<string, RawOffer[]>;
  rows: StockRow[];
  rowsByStore: Map<string, StockRow[]>;
  rowByKey: Map<string, StockRow>;
  /** Normalized product names, for the `q` filter. */
  names: Map<string, string>;
  /** Memoized best-supplier evaluations (restock.ts), keyed by `${store}|${product}`. */
  selections: Map<string, unknown>;
};

let cached: Promise<OpsData> | null = null;

export function loadOps(): Promise<OpsData> {
  return (cached ??= (async () => {
    const [meta, stores, products, suppliers, offers, rows] = await Promise.all([
      loadMeta(), loadStores(), loadProducts(), loadSuppliers(), loadOffers(), loadStock(),
    ]);
    const offersByProduct = new Map<string, RawOffer[]>();
    for (const o of offers) {
      const list = offersByProduct.get(o.product_id);
      if (list) list.push(o);
      else offersByProduct.set(o.product_id, [o]);
    }
    const rowsByStore = new Map<string, StockRow[]>();
    const rowByKey = new Map<string, StockRow>();
    for (const r of rows) {
      const list = rowsByStore.get(r.store_id);
      if (list) list.push(r);
      else rowsByStore.set(r.store_id, [r]);
      rowByKey.set(`${r.store_id}|${r.product_id}`, r);
    }
    return {
      asOf: meta.data_as_of,
      stores: new Map(stores.map((s) => [s.store_id, s])),
      products: new Map(products.map((p) => [p.product_id, p])),
      suppliers: new Map(suppliers.map((s) => [s.supplier_id, s])),
      offers: offersByProduct,
      rows,
      rowsByStore,
      rowByKey,
      names: new Map(products.map((p) => [p.product_id, normalize(p.product_name)])),
      selections: new Map(),
    };
  })());
}

/** Rows of one store, or every row of the chain for "all". Unknown store → undefined. */
export function rowsOf(d: OpsData, storeId: string): StockRow[] | undefined {
  return storeId === "all" ? d.rows : d.rowsByStore.get(storeId);
}

/** Orders sent in this session, grouped by `${store}|${product}`. */
export function sentOrdersByKey(): Map<string, RestockOrder[]> {
  const map = new Map<string, RestockOrder[]>();
  for (const raw of Object.values(getState().sentOrders)) {
    const parsed = restockOrderSchema.safeParse(raw);
    if (!parsed.success) continue;
    const key = `${parsed.data.store_id}|${parsed.data.product_id}`;
    const list = map.get(key);
    if (list) list.push(parsed.data);
    else map.set(key, [parsed.data]);
  }
  return map;
}

/** Deterministic id of the synthetic open purchase order behind a stock row. */
export const openOrderId = (row: StockRow) => `PO-${row.store_id}-${row.product_id}`;
