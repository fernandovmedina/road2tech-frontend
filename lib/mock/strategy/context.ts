import {
  loadAffinity, loadCalendarRows, loadCampaigns, loadMeta, loadOffers, loadProducts, loadSales, loadStock, loadStores, loadZones,
  type RawAffinity, type RawCalendarRow, type RawProduct, type RawSales, type RawStore, type StockRow,
} from "../db";

// Read-only view over the sample dataset used by the strategy / tendency / chat mock "backend".
// Everything here is plain lookups; the economic simulation lives in engine.ts.

/** Elasticity evidence taken from the real campaigns with treatment/control (campaigns.json). */
export type CampaignStat = {
  /** Mean observed lift of units (fraction, 0.36 = +36 %). */
  lift: number;
  /** Standard deviation of the observed lift (fraction). */
  sd: number;
  /** Discount used by those campaigns (fraction). */
  discount: number;
  /** Mean uplift of the anchor product (fraction). */
  anchorUplift: number;
  n: number;
};

export type Ctx = {
  asOf: string;
  stores: RawStore[]; // sorted by store_id
  storeById: Map<string, RawStore>;
  products: RawProduct[];
  productById: Map<string, RawProduct>;
  /** Cheapest supplier offer per product (cost used by the mock engine). */
  costByProduct: Map<string, { unit_cost: number; min_order_qty: number }>;
  stockByKey: Map<string, StockRow>;
  stockByStore: Map<string, StockRow[]>;
  calendar: Map<string, RawCalendarRow>;
  weekendMultiplier: Map<string, number>;
  sales: RawSales;
  affinity: RawAffinity;
  campaignByType: Map<string, CampaignStat>;
  campaignByTypeProduct: Map<string, CampaignStat>;
};

function statOf(list: { observed_lift_pct: number; discount_pct: number; uplift_anchor_pct: number }[]): CampaignStat {
  const n = list.length;
  const lifts = list.map((c) => c.observed_lift_pct / 100);
  const mean = lifts.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(lifts.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
  return {
    lift: mean,
    sd,
    discount: list.reduce((s, c) => s + c.discount_pct, 0) / n,
    anchorUplift: list.reduce((s, c) => s + c.uplift_anchor_pct, 0) / n,
    n,
  };
}

let ctxPromise: Promise<Ctx> | null = null;

export function loadCtx(): Promise<Ctx> {
  return (ctxPromise ??= build());
}

async function build(): Promise<Ctx> {
  const [meta, stores, products, offers, stock, calendar, zones, sales, affinity, campaigns] = await Promise.all([
    loadMeta(), loadStores(), loadProducts(), loadOffers(), loadStock(), loadCalendarRows(), loadZones(), loadSales(),
    loadAffinity(), loadCampaigns(),
  ]);

  const costByProduct = new Map<string, { unit_cost: number; min_order_qty: number }>();
  for (const o of offers) {
    const cur = costByProduct.get(o.product_id);
    if (!cur || o.unit_cost < cur.unit_cost) costByProduct.set(o.product_id, { unit_cost: o.unit_cost, min_order_qty: o.min_order_qty });
  }

  const stockByKey = new Map<string, StockRow>();
  const stockByStore = new Map<string, StockRow[]>();
  for (const r of stock) {
    stockByKey.set(`${r.store_id}|${r.product_id}`, r);
    const list = stockByStore.get(r.store_id);
    if (list) list.push(r);
    else stockByStore.set(r.store_id, [r]);
  }

  const byType = new Map<string, typeof campaigns>();
  const byTypeProduct = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    (byType.get(c.strategy_type) ?? byType.set(c.strategy_type, []).get(c.strategy_type)!).push(c);
    const k = `${c.strategy_type}|${c.promoted_product_id}`;
    (byTypeProduct.get(k) ?? byTypeProduct.set(k, []).get(k)!).push(c);
  }

  return {
    asOf: meta.data_as_of,
    stores: [...stores].sort((a, b) => a.store_id.localeCompare(b.store_id)),
    storeById: new Map(stores.map((s) => [s.store_id, s])),
    products,
    productById: new Map(products.map((p) => [p.product_id, p])),
    costByProduct,
    stockByKey,
    stockByStore,
    calendar: new Map(calendar.map((r) => [r.date, r])),
    weekendMultiplier: new Map(zones.map((z) => [z.zone_type, z.weekend_multiplier])),
    sales,
    affinity,
    campaignByType: new Map([...byType].map(([k, v]) => [k, statOf(v)])),
    campaignByTypeProduct: new Map([...byTypeProduct].map(([k, v]) => [k, statOf(v)])),
  };
}

/** Campaign evidence for a strategy type; uses the promoted product's own campaigns when there are some. */
export function campaignStat(ctx: Ctx, type: string, promotedId: string): CampaignStat {
  const own = ctx.campaignByTypeProduct.get(`${type}|${promotedId}`);
  const all = ctx.campaignByType.get(type);
  if (own && own.n >= 3) {
    // Blend with the type average so one noisy product does not dominate.
    const w = Math.min(0.6, own.n / 20);
    const base = all ?? own;
    return {
      lift: own.lift * w + base.lift * (1 - w),
      sd: Math.max(own.sd, base.sd) * 0.9,
      discount: own.discount,
      anchorUplift: own.anchorUplift,
      n: own.n,
    };
  }
  return all ?? { lift: 0.2, sd: 0.1, discount: 0.1, anchorUplift: 0.04, n: 0 };
}
