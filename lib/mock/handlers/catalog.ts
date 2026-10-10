import type { MockRoute, MockContext } from "../router";
import { MockHttpError } from "../router";
import {
  hash01, loadAffinity, loadCategories, loadMeta, loadOffers, loadProductMap, loadProducts, loadSales, loadStock,
  loadStoreMap, loadStores, loadSuppliers, loadTicketKpis, loadZones, loadStockMap,
  type RawOffer, type RawProduct, type RawTicketScope, type StockRow,
} from "../db";
import { allStatuses } from "../derive";
import { getStorePlan } from "./strategy";

// Mock "backend" for catalogs and dashboard (contract sections 3.1-3.6, 3.14, 3.16). Handlers return the `data`
// part of the envelope; it is validated with the schemas in lib/api/schemas.ts. Economic numbers live here because
// the mock plays the backend; everything is deterministic (hash01, never Math.random) and derived from lib/mock/data.

/* ---------------------------------- helpers ---------------------------------- */

const DAY_MS = 86_400_000;
const parseDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(parseDay(iso) + n * DAY_MS);
const diffDays = (a: string, b: string) => Math.round((parseDay(b) - parseDay(a)) / DAY_MS); // b - a
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const isIso = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const nf = (n: number, digits = 0) => n.toLocaleString("es-MX", { maximumFractionDigits: digits, minimumFractionDigits: digits });

function pageParams(q: Record<string, string>) {
  const page = Math.max(1, Math.floor(Number(q.page)) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(q.page_size)) || 25));
  return { page, pageSize };
}

function paginate<T>(rows: T[], q: Record<string, string>) {
  const { page, pageSize } = pageParams(q);
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), page, page_size: pageSize, total: rows.length };
}

/** Resolve the requested period; defaults depend on mode (actual: last 30 days, forecast: next 14 days). */
async function resolvePeriod(q: Record<string, string>) {
  const asOf = (await loadMeta()).data_as_of;
  const mode: "actual" | "forecast" = q.mode === "forecast" ? "forecast" : "actual";
  let from = isIso(q.from) ? q.from : undefined;
  let to = isIso(q.to) ? q.to : undefined;
  if (!from && !to) {
    if (mode === "forecast") {
      from = addDays(asOf, 1);
      to = addDays(asOf, 14);
    } else {
      from = addDays(asOf, -29);
      to = asOf;
    }
  }
  from ??= addDays(to!, -29);
  to ??= addDays(from, 29);
  if (from > to) [from, to] = [to, from];
  return { asOf, mode, from, to, span: diffDays(from, to) + 1 };
}

/* ------------------------- catalog derivations (default supplier) ------------------------- */

type Offer = RawOffer;

let offersByProduct: Promise<Map<string, Offer[]>> | null = null;
const getOffersByProduct = () =>
  (offersByProduct ??= loadOffers().then((all) => {
    const m = new Map<string, Offer[]>();
    for (const o of all) (m.get(o.product_id) ?? m.set(o.product_id, []).get(o.product_id)!).push(o);
    return m;
  }));

/**
 * Mock rule for the default supplier of a product: highest score = (retail_price - unit_cost) * reliability_score
 * (expected margin per unit weighted by on-time probability); ties go to the shorter lead time, then to supplier_id.
 */
async function defaultOffer(product: RawProduct): Promise<Offer> {
  const offers = (await getOffersByProduct()).get(product.product_id) ?? [];
  const suppliers = new Map((await loadSuppliers()).map((s) => [s.supplier_id, s]));
  let best: Offer | null = null;
  let bestScore = -Infinity;
  for (const o of offers) {
    const score = (product.retail_price - o.unit_cost) * (suppliers.get(o.supplier_id)?.reliability_score ?? 0);
    const better =
      best === null ||
      score > bestScore + 1e-9 ||
      (Math.abs(score - bestScore) <= 1e-9 &&
        (o.lead_time_days < best.lead_time_days || (o.lead_time_days === best.lead_time_days && o.supplier_id < best.supplier_id)));
    if (better) {
      best = o;
      bestScore = score;
    }
  }
  if (!best) throw new MockHttpError(500, "no_offer", `Sin ofertas de proveedor para ${product.product_id}`);
  return best;
}

let unitCosts: Promise<Map<string, number>> | null = null;
/** product_id -> unit cost of its default supplier (used to value waste/margins in the mock). */
const getUnitCosts = () =>
  (unitCosts ??= loadProducts().then(async (ps) => new Map(await Promise.all(ps.map(async (p) => [p.product_id, (await defaultOffer(p)).unit_cost] as const)))));

/* ----------------------------------- /meta ----------------------------------- */

async function getMeta() {
  const [meta, categories, zones] = await Promise.all([loadMeta(), loadCategories(), loadZones()]);
  return {
    data_as_of: meta.data_as_of,
    history_start: meta.history_start,
    forecast_horizon_days: 14,
    horizons: { history_days: [7, 30], forecast_days: [7, 14, 30] },
    default_plan_days: 7,
    max_strategies_per_plan: 5,
    categories: categories.map((c) => ({
      category_id: c.category_id, category_name: c.category_name, is_perishable: c.is_perishable,
      typical_shelf_life_days: c.typical_shelf_life_days, requires_refrigeration: c.requires_refrigeration,
    })),
    zones: zones.map((z) => ({ zone_type: z.zone_type, description: z.description })),
    demo_mode: true,
  };
}

/* -------------------------------- catalogs --------------------------------- */

async function listProducts({ query, empty }: MockContext) {
  if (empty) return paginate([], query);
  const q = norm(query.q ?? "").trim();
  const rows = (await loadProducts()).filter(
    (p) =>
      (!query.category_id || p.category_id === query.category_id) &&
      (!q || norm(`${p.product_name} ${p.brand} ${p.product_id}`).includes(q)),
  );
  const items = await Promise.all(
    paginate(rows, query).items.map(async (p) => {
      const o = await defaultOffer(p);
      return {
        product_id: p.product_id, product_name: p.product_name, category_id: p.category_id, brand: p.brand, unit: p.unit,
        retail_price: p.retail_price, shelf_life_days: p.shelf_life_days, is_seasonal: p.is_seasonal,
        weather_sensitivity: p.weather_sensitivity, base_daily_demand: p.base_daily_demand,
        default_supplier: { supplier_id: o.supplier_id, unit_cost: o.unit_cost, min_order_qty: o.min_order_qty },
      };
    }),
  );
  return { ...paginate(rows, query), items };
}

async function listSuppliers({ empty }: MockContext) {
  if (empty) return { items: [] };
  const [suppliers, offers] = await Promise.all([loadSuppliers(), loadOffers()]);
  return {
    items: suppliers.map((s) => ({
      supplier_id: s.supplier_id, supplier_name: s.supplier_name, email: s.email, city: s.city,
      categories_served: s.categories_served.split("|").filter(Boolean),
      reliability_score: s.reliability_score,
      offers_count: offers.filter((o) => o.supplier_id === s.supplier_id).length,
    })),
  };
}

async function supplierOffers({ params, query, empty }: MockContext) {
  const supplier = (await loadSuppliers()).find((s) => s.supplier_id === params.supplierId);
  if (!supplier) throw new MockHttpError(404, "not_found", "Proveedor no encontrado");
  if (empty) return { supplier_id: supplier.supplier_id, ...paginate([], query) };
  const products = await loadProductMap();
  const q = norm(query.q ?? "").trim();
  const rows = (await loadOffers())
    .filter((o) => o.supplier_id === supplier.supplier_id)
    .map((o) => ({ o, p: products.get(o.product_id) }))
    .filter((x): x is { o: Offer; p: RawProduct } => !!x.p)
    .filter(({ p }) => (!query.category_id || p.category_id === query.category_id) && (!q || norm(`${p.product_name} ${p.brand}`).includes(q)))
    .sort((a, b) => a.p.product_id.localeCompare(b.p.product_id))
    .map(({ o, p }) => ({
      product_id: p.product_id, product_name: p.product_name, category_id: p.category_id, unit_cost: o.unit_cost,
      min_order_qty: o.min_order_qty, lead_time_days: o.lead_time_days, delivery_days: o.delivery_days, retail_price: p.retail_price,
    }));
  return { supplier_id: supplier.supplier_id, ...paginate(rows, query) };
}

/* ------------------------------- dashboard KPIs ------------------------------- */

type StoresFilter = { storeIds: string[]; isChain: boolean };

/** Stores in scope: one store, the whole chain, or the chain restricted by zone_type (primary or secondary). */
async function storesInScope(storeId: string | null, zone: string | undefined): Promise<StoresFilter> {
  const stores = await loadStores();
  if (storeId) {
    if (!stores.some((s) => s.store_id === storeId)) throw new MockHttpError(404, "not_found", "Sucursal no encontrada");
    return { storeIds: [storeId], isChain: false };
  }
  const ids = stores.filter((s) => !zone || s.zone_type === zone || s.secondary_zone_type === zone).map((s) => s.store_id);
  return { storeIds: ids, isChain: !zone };
}

/** Ticket numbers for the scope; zone subsets are the ticket-weighted combination of their stores (real data). */
async function ticketScope(filter: StoresFilter, window: "last7" | "last30") {
  const kpis = await loadTicketKpis();
  const pick = (id: string): RawTicketScope => kpis.scopes[id][window];
  if (filter.isChain) {
    const s = pick("ALL");
    return { avg: s.averageTicket, prevAvg: s.previous.averageTicket, ipt: s.itemsPerTicket, prevIpt: s.previous.itemsPerTicket, deltaFraction: s.deltaPct / 100 };
  }
  if (filter.storeIds.length === 1) {
    const s = pick(filter.storeIds[0]);
    return { avg: s.averageTicket, prevAvg: s.previous.averageTicket, ipt: s.itemsPerTicket, prevIpt: s.previous.itemsPerTicket, deltaFraction: s.deltaPct / 100 };
  }
  let t = 0, pt = 0, avg = 0, prevAvg = 0, ipt = 0, prevIpt = 0;
  for (const id of filter.storeIds) {
    const s = pick(id);
    t += s.tickets; pt += s.previous.tickets;
    avg += s.tickets * s.averageTicket; ipt += s.tickets * s.itemsPerTicket;
    prevAvg += s.previous.tickets * s.previous.averageTicket; prevIpt += s.previous.tickets * s.previous.itemsPerTicket;
  }
  avg /= t; ipt /= t; prevAvg /= pt; prevIpt /= pt;
  return { avg, prevAvg, ipt, prevIpt, deltaFraction: prevAvg ? avg / prevAvg - 1 : 0 };
}

/**
 * Stock counters for a set of stores.
 *  - stockout_products: store x product pairs whose status is "out" (quantity 0). In forecast mode we also count the
 *    pairs projected to run out inside the horizon: quantity + on-order < predicted_daily_demand * min(span, 14) / 7 (less than 1-2 days of cover).
 *  - no_demand_products (mock rule): store x product pairs that are NOT out and sold < 0.3 units/day on average over the
 *    last 14 days (avg_daily_units_14d < 0.3); in forecast mode the predicted daily demand replaces that average.
 */
async function stockCounters(storeIds: string[], mode: "actual" | "forecast", span: number) {
  const set = new Set(storeIds);
  let stockouts = 0, noDemand = 0;
  for (const { row, status } of await allStatuses()) {
    if (!set.has(row.store_id)) continue;
    if (mode === "actual") {
      if (status === "out") stockouts++;
      else if (row.avg_daily_units_14d < 0.3) noDemand++;
    } else {
      const projectedOut = status === "out" || row.quantity + row.on_order_qty < row.predicted_daily_demand * (Math.min(span, 14) / 7);
      if (projectedOut) stockouts++;
      else if (row.predicted_daily_demand < 0.3) noDemand++;
    }
  }
  return { stockouts, noDemand };
}

async function opportunityOf(storeId: string) {
  const plan = await getStorePlan(storeId);
  return {
    storeId,
    margin: plan.portfolio.net_expected_margin_increment,
    ci: plan.portfolio.confidence_interval,
    count: plan.strategies.filter((s) => s.status !== "rejected").length,
  };
}

async function buildKpis(filter: StoresFilter, p: Awaited<ReturnType<typeof resolvePeriod>>, opportunity: number, empty: boolean) {
  const t = await ticketScope(filter, p.span <= 7 ? "last7" : "last30");
  const scopeKey = filter.isChain ? "ALL" : filter.storeIds.join(",");
  let avg = t.avg, delta = t.deltaFraction, ipt = t.ipt, iptDelta = t.prevIpt ? t.ipt / t.prevIpt - 1 : 0;
  if (p.mode === "forecast") {
    // Small deterministic projection vs the current actual (-1.75% .. +3.25% ticket, -1.2% .. +1.8% items per ticket).
    const adj = (hash01(`fc-ticket|${scopeKey}|${p.span}`) - 0.35) * 0.05;
    const adjIpt = (hash01(`fc-ipt|${scopeKey}|${p.span}`) - 0.4) * 0.03;
    avg = t.avg * (1 + adj);
    delta = adj;
    ipt = t.ipt * (1 + adjIpt);
    iptDelta = adjIpt;
  }
  const counters = empty ? { stockouts: 0, noDemand: 0 } : await stockCounters(filter.storeIds, p.mode, p.span);
  return {
    average_ticket: round2(avg),
    average_ticket_delta_pct: round4(delta),
    items_per_ticket: round2(ipt),
    items_per_ticket_delta_pct: round4(iptDelta),
    stockout_products: counters.stockouts,
    no_demand_products: counters.noDemand,
    ai_opportunity_mxn: round2(empty ? 0 : opportunity),
  };
}

async function chainSummary({ query, empty }: MockContext) {
  const p = await resolvePeriod(query);
  const filter = await storesInScope(null, query.zone || undefined);
  const storeMap = await loadStoreMap();
  const opps = empty ? [] : await Promise.all(filter.storeIds.map(opportunityOf));
  const total = opps.reduce((a, o) => a + o.margin, 0);
  const ranking = opps
    .map((o) => {
      const s = storeMap.get(o.storeId)!;
      return { store_id: o.storeId, colonia: s.colonia, zone_type: s.zone_type, opportunity_mxn: round2(o.margin), strategies_count: o.count };
    })
    .sort((a, b) => b.opportunity_mxn - a.opportunity_mxn || a.store_id.localeCompare(b.store_id));
  return {
    period: { from: p.from, to: p.to },
    mode: p.mode,
    kpis: await buildKpis(filter, p, total, empty),
    portfolio_impact: {
      net_expected_margin_increment: round2(total),
      // Sum of the stores' intervals: conservative, deterministic and consistent with the per-store plans.
      confidence_interval: {
        low: round2(opps.reduce((a, o) => a + o.ci.low, 0)),
        high: round2(opps.reduce((a, o) => a + o.ci.high, 0)),
        level: opps[0]?.ci.level ?? 0.8,
      },
      stores_with_plan: opps.filter((o) => o.count > 0).length,
      strategies_count: opps.reduce((a, o) => a + o.count, 0),
    },
    store_ranking: ranking,
  };
}

async function storeKpis({ params, query, empty }: MockContext) {
  const p = await resolvePeriod(query);
  const filter = await storesInScope(params.storeId, undefined);
  const opp = empty ? 0 : (await opportunityOf(params.storeId)).margin;
  return { store_id: params.storeId, period: { from: p.from, to: p.to }, mode: p.mode, kpis: await buildKpis(filter, p, opp, empty) };
}

/* ----------------------------------- /heat ----------------------------------- */

/**
 * Units sold (or forecast) per store in [from, to]. Days inside the sales window use real daily sales; days after the
 * data cut-off use the predicted daily demand from the stock table; days before the window are ignored.
 */
async function heat({ query, empty }: MockContext) {
  const p = await resolvePeriod(query);
  const productId = query.product_id || null;
  const products = await loadProductMap();
  if (productId && !products.has(productId)) throw new MockHttpError(404, "not_found", "Producto no encontrado");
  if (empty) return { product_id: productId, metric: "units_sold", items: [] };

  const [sales, stock] = await Promise.all([loadSales(), loadStock()]);
  const filter = await storesInScope(null, query.zone || undefined);
  const first = Math.max(0, diffDays(sales.start, p.from));
  const last = Math.min(sales.days - 1, diffDays(sales.start, p.to));
  const futureCount = p.to > sales.end ? diffDays(p.from > sales.end ? p.from : addDays(sales.end, 1), p.to) + 1 : 0;

  const predicted = new Map<string, number>();
  for (const r of stock) {
    if (productId && r.product_id !== productId) continue;
    predicted.set(r.store_id, (predicted.get(r.store_id) ?? 0) + r.predicted_daily_demand);
  }
  const units = filter.storeIds.map((storeId) => {
    let u = 0;
    const byProduct = sales.series[storeId] ?? {};
    for (const pid of productId ? [productId] : Object.keys(byProduct)) {
      const arr = byProduct[pid];
      if (!arr) continue;
      for (let i = first; i <= last; i++) u += arr[i];
    }
    u += (predicted.get(storeId) ?? 0) * futureCount;
    return { storeId, units: Math.round(u) };
  });
  const max = Math.max(0, ...units.map((u) => u.units));
  const top = units.find((u) => u.units === max)?.storeId ?? null; // first store with the max (one leader only)
  return {
    product_id: productId,
    metric: "units_sold",
    items: units.map((u) => ({
      store_id: u.storeId,
      movement: max ? Math.round((u.units / max) * 100) : 0,
      units: u.units,
      is_top: u.storeId === top,
    })),
  };
}

/* --------------------------------- behaviors --------------------------------- */

type Behavior = {
  id: string; kind: "crosssell" | "waste" | "demand"; source: "observed" | "estimated"; title: string; text: string;
  product_id: string; related_product_id: string | null;
  affinity: { observed_ticket_share: number | null; estimated_ticket_share: number | null; lift: number | null; tickets_sample: number | null } | null;
  estimated_gain_mxn: number;
};

const sum = (a: number[], from: number, to: number) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] ?? 0;
  return s;
};

async function behaviors({ params, query, empty }: MockContext) {
  const storeId = params.storeId;
  if (!(await loadStoreMap()).has(storeId)) throw new MockHttpError(404, "not_found", "Sucursal no encontrada");
  const limit = Math.min(20, Math.max(1, Math.floor(Number(query.limit)) || 6));
  if (empty) return { items: [] };

  const [aff, sales, kpis, products, costs, stockMap, meta] = await Promise.all([
    loadAffinity(), loadSales(), loadTicketKpis(), loadProductMap(), getUnitCosts(), loadStockMap(), loadMeta(),
  ]);
  const margin = (pid: string) => Math.max(0, (products.get(pid)?.retail_price ?? 0) - (costs.get(pid) ?? 0));
  const nameOf = (pid: string) => products.get(pid)?.product_name ?? pid;
  const series = sales.series[storeId] ?? {};
  const storeTickets = kpis.scopes[storeId]?.last30.tickets ?? aff.tickets;

  // (a) Cross-sell. Observed: pairs measured in this store's tickets (affinity.json byStore). A promotion that makes
  // 8% of the anchor's 14-day units carry the paired product is valued at the margin of the paired product (mock rule).
  const crosssell: Behavior[] = [];
  const observedPairs = aff.byStore[storeId] ?? [];
  const pairOf = (x: { a: string; b: string }) => `${x.a}|${x.b}`;
  const attachGain = (a: string, b: string) => {
    const anchorUnits14 = sum(series[a] ?? [], sales.days - 14, sales.days);
    return round2(anchorUnits14 * 0.08 * margin(b));
  };
  for (const pair of observedPairs) {
    // Only meaningful pairs: at least 3 tickets and clearly above chance (lift >= 1.5).
    if (!products.has(pair.a) || !products.has(pair.b) || pair.tickets < 3 || pair.lift < 1.5) continue;
    crosssell.push({
      id: `beh_${storeId}_${pair.a}_${pair.b}`,
      kind: "crosssell",
      source: "observed",
      title: `${nameOf(pair.a)} se compra junto con ${nameOf(pair.b)}`,
      text: `${pair.tickets} de ${nf(storeTickets)} tickets de los últimos 30 días llevan ambos productos (${nf(pair.pctTickets, 2)} % de los tickets), ${nf(pair.lift, 1)} veces más de lo esperado por azar. Una promoción cruzada puede subir el ticket.`,
      product_id: pair.a,
      related_product_id: pair.b,
      affinity: { observed_ticket_share: round4(pair.pctTickets / 100), estimated_ticket_share: null, lift: pair.lift, tickets_sample: storeTickets },
      estimated_gain_mxn: attachGain(pair.a, pair.b),
    });
  }
  // Estimated: strong chain-level pairs without enough tickets in this store yet (inferred from the chain share).
  const seen = new Set(crosssell.map((b) => `${b.product_id}|${b.related_product_id}`));
  for (const pair of aff.chain) {
    if (seen.has(pairOf(pair)) || !products.has(pair.a) || !products.has(pair.b) || pair.lift < 1.5) continue;
    crosssell.push({
      id: `beh_${storeId}_${pair.a}_${pair.b}`,
      kind: "crosssell",
      source: "estimated",
      title: `${nameOf(pair.a)} podría venderse con ${nameOf(pair.b)}`,
      text: `En la cadena el ${nf(pair.pctTickets, 2)} % de los tickets lleva ambos productos (${nf(pair.lift, 1)} veces más que el azar); en esta sucursal aún hay pocos tickets para confirmarlo, así que es una estimación.`,
      product_id: pair.a,
      related_product_id: pair.b,
      affinity: { observed_ticket_share: null, estimated_ticket_share: round4(pair.pctTickets / 100), lift: pair.lift, tickets_sample: null },
      estimated_gain_mxn: round2(attachGain(pair.a, pair.b) * 0.6),
    });
  }

  // (b) Waste (estimated): the earliest lot expires within 10 days and current stock exceeds what the predicted daily
  // demand can sell before then. At-risk units recover ~60% of their cost with a markdown (mock rule).
  const waste: Behavior[] = [];
  for (const [pid] of products) {
    const row: StockRow | undefined = stockMap.get(`${storeId}|${pid}`);
    if (!row || !row.earliest_expiry || row.quantity <= 0) continue;
    const daysLeft = diffDays(meta.data_as_of, row.earliest_expiry);
    if (daysLeft < 0 || daysLeft > 10) continue;
    const sellable = row.predicted_daily_demand * Math.max(daysLeft, 1);
    const atRisk = Math.floor(Math.min(row.quantity, row.quantity - sellable));
    if (atRisk < 3) continue;
    waste.push({
      id: `beh_${storeId}_${pid}_waste`,
      kind: "waste",
      source: "estimated",
      title: `${nameOf(pid)} tiene riesgo de caducar`,
      text: `El lote más próximo vence en ${daysLeft === 0 ? "menos de un día" : daysLeft === 1 ? "1 día" : `${daysLeft} días`}, quedan ${nf(row.quantity)} piezas y la demanda proyectada vende cerca de ${nf(sellable)}. Unas ${nf(atRisk)} piezas podrían mermarse sin una promoción de rescate.`,
      product_id: pid,
      related_product_id: null,
      affinity: null,
      estimated_gain_mxn: round2(atRisk * (costs.get(pid) ?? 0) * 0.6),
    });
  }

  // (c) Rising demand (observed in sales): last 14 days vs the 14 before. Needs >= 15% growth and >= 1 unit/day.
  // Gain = extra units expected in the next 14 days valued at unit margin.
  const demand: Behavior[] = [];
  for (const [pid, arr] of Object.entries(series)) {
    if (!products.has(pid)) continue;
    const recent = sum(arr, sales.days - 14, sales.days);
    const prev = sum(arr, sales.days - 28, sales.days - 14);
    if (prev <= 0 || recent / 14 < 1 || recent / prev < 1.15) continue;
    const growth = recent / prev - 1;
    demand.push({
      id: `beh_${storeId}_${pid}_demand`,
      kind: "demand",
      source: "observed",
      title: `Sube la demanda de ${nameOf(pid)}`,
      text: `Las ventas de los últimos 14 días (${nf(recent)} uds.) superan en ${nf(growth * 100)} % a los 14 días previos (${nf(prev)} uds.). Conviene asegurar el abasto para no perder la venta.`,
      product_id: pid,
      related_product_id: null,
      affinity: null,
      estimated_gain_mxn: round2(Math.max(0, recent - prev) * margin(pid)),
    });
  }

  const byGain = (a: Behavior, b: Behavior) => b.estimated_gain_mxn - a.estimated_gain_mxn || a.id.localeCompare(b.id);
  const groups = [crosssell, waste, demand].map((g) => g.sort(byGain));
  // Cards: best of each kind first (so the top 3 are varied), then the rest by gain.
  const heads = groups.map((g) => g[0]).filter((b): b is Behavior => !!b).sort(byGain);
  const rest = groups.flatMap((g) => g.slice(1)).sort(byGain);
  return { items: [...heads, ...rest].slice(0, limit) };
}

/* ----------------------------------- routes ----------------------------------- */

export const routes: MockRoute[] = [
  { method: "GET", path: "/meta", handler: () => getMeta() },
  { method: "GET", path: "/stores", handler: async () => ({ items: await loadStores() }) },
  { method: "GET", path: "/products", handler: listProducts },
  { method: "GET", path: "/suppliers", handler: listSuppliers },
  { method: "GET", path: "/suppliers/:supplierId/offers", handler: supplierOffers },
  { method: "GET", path: "/chain/summary", handler: chainSummary },
  { method: "GET", path: "/stores/:storeId/kpis", handler: storeKpis },
  { method: "GET", path: "/heat", handler: heat },
  { method: "GET", path: "/stores/:storeId/behaviors", handler: behaviors },
];
