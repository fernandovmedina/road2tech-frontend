import { addDays, parseIso, todayIso } from "@/lib/format";
import type {
  BehaviorInsight, BranchHeat, CalendarEvent, DataMode, Kpis, Product, PromoScenario, PromoSuggestion,
  RangeKey, RestockSuggestion, StockItem, StockStatus, Supplier, TrendPoint,
} from "@/types";
import { branchWeight, branches, hash01, productSeeds, stockQuantity, suppliers as seedSuppliers } from "./seed";
import { getState } from "./store";

// Derived mock "model". TODO(backend): every export here maps to a future endpoint.

/* ---------- catalog (seed + session edits) ---------- */

export function getProducts(): Product[] {
  const mm = getState().minMax;
  return productSeeds.map((p) => {
    const { baseDemand: _b, complementId: _c, trendPct: _t, ...product } = p;
    void _b; void _c; void _t;
    return { ...product, ...(mm[p.id] ?? {}) };
  });
}
export const getProduct = (id: string) => getProducts().find((p) => p.id === id);
const seedOf = (id: string) => productSeeds.find((p) => p.id === id);

export function getSuppliers(): Supplier[] {
  const s = getState();
  return [...seedSuppliers, ...s.extraSuppliers].map((x) => ({ ...x, ...(s.supplierPatches[x.id] ?? {}) }));
}

export const trendPctOf = (productId: string) => seedOf(productId)?.trendPct ?? 0;

/* ---------- demand ---------- */

// units/day for a product in a branch ("all" = whole chain)
export function dailyDemand(productId: string, branchId: string | "all"): number {
  const seed = seedOf(productId);
  if (!seed) return 0;
  if (branchId === "all") return seed.baseDemand;
  const jitter = 0.85 + hash01(`${productId}|${branchId}|d`) * 0.3;
  return seed.baseDemand * (branchWeight[branchId] ?? 0.1) * jitter;
}

/* ---------- promotion math (single source of truth) ---------- */

export type PromoInput = { price: number; cost: number; stock: number; baseUnits: number; carryRate: number; complementMargin: number };

export function simulatePromo(input: PromoInput, discountPct: number): PromoScenario {
  const { price, cost, stock, baseUnits, carryRate, complementMargin } = input;
  const demand = baseUnits * (1 + 0.7 * (1 - Math.exp(-discountPct / 14)));
  const sold = Math.min(stock, demand);
  const waste = stock - sold;
  const effectivePrice = price * (1 - discountPct / 100);
  const margin = sold * (effectivePrice - cost);
  const wasteCost = waste * cost;
  const crossSell = Math.max(0, sold - baseUnits) * carryRate * complementMargin;
  return {
    unitsSold: Math.round(sold),
    revenue: Math.round(sold * effectivePrice),
    margin: Math.round(margin),
    wasteUnits: Math.round(waste),
    wasteCost: Math.round(wasteCost),
    crossSellRevenue: Math.round(crossSell),
    netProfit: Math.round(margin - wasteCost + crossSell),
  };
}

export function optimalDiscount(input: PromoInput): number {
  let best = 0;
  let bestNet = -Infinity;
  for (let d = 0; d <= 40; d++) {
    const net = simulatePromo(input, d).netProfit;
    if (net > bestNet) { bestNet = net; best = d; }
  }
  return best;
}

type PromoSeed = {
  id: string; productId: string; branchId: string; title: string; kind: "promo" | "crosssell";
  startOffset: number; durationDays: number; windowFactor: number; drivers: PromoSuggestion["drivers"];
};

const promoSeeds: PromoSeed[] = [
  { id: "promo-yogurt", productId: "p-yogurt", branchId: "b-centro", title: "Yogurt natural 1 L: liquidar excedente", kind: "promo", startOffset: 3, durationDays: 7, windowFactor: 0.6, drivers: ["shelf_life", "bought_together", "demand"] },
  { id: "promo-cerveza", productId: "p-cerveza", branchId: "b-norte", title: "Cerveza + papas fritas para el fin de semana", kind: "crosssell", startOffset: 6, durationDays: 3, windowFactor: 0.7, drivers: ["event", "bought_together", "weather"] },
  { id: "promo-jugo", productId: "p-jugo", branchId: "b-valle", title: "Jugo de naranja 1 L: evitar merma", kind: "promo", startOffset: 5, durationDays: 6, windowFactor: 0.55, drivers: ["shelf_life", "season"] },
  { id: "promo-granola", productId: "p-granola", branchId: "b-centro", title: "Granola con miel junto al yogurt", kind: "crosssell", startOffset: 9, durationDays: 7, windowFactor: 0.9, drivers: ["bought_together", "demand"] },
];

export const WINDOW_DAYS = 14;

function promoInput(seed: PromoSeed): PromoInput {
  const p = seedOf(seed.productId)!;
  const comp = seedOf(p.complementId)!;
  const stock = stockQuantity(p.id, seed.branchId, p.maxStock);
  return {
    price: p.price,
    cost: p.unitCost,
    stock,
    baseUnits: dailyDemand(p.id, seed.branchId) * WINDOW_DAYS * seed.windowFactor,
    carryRate: 0.35,
    complementMargin: (comp.price - comp.unitCost) * 1.1,
  };
}

export function getPromoInput(promoId: string): PromoInput | undefined {
  const s = promoSeeds.find((x) => x.id === promoId);
  return s ? promoInput(s) : undefined;
}

export function getPromos(): PromoSuggestion[] {
  const today = todayIso();
  const st = getState().promoStatus;
  return promoSeeds.map((s) => {
    const input = promoInput(s);
    const opt = optimalDiscount(input);
    const saved = st[s.id];
    const discountPct = saved?.discountPct ?? opt;
    return {
      id: s.id,
      productId: s.productId,
      branchId: s.branchId,
      title: s.title,
      kind: s.kind,
      discountPct,
      optimalDiscountPct: opt,
      startDate: addDays(today, s.startOffset),
      endDate: addDays(today, s.startOffset + s.durationDays - 1),
      drivers: s.drivers,
      // headline numbers are always at the optimal discount so every screen agrees
      withoutPromo: simulatePromo(input, 0),
      withPromo: simulatePromo(input, opt),
      status: saved?.status ?? "pending",
    };
  });
}

export const promoGain = (p: PromoSuggestion) => p.withPromo.netProfit - p.withoutPromo.netProfit;

/* ---------- scope helpers ---------- */

export const rangeFactor: Record<RangeKey, number> = { last7: 0.55, last30: 1, next14: 0.75, next30: 1.2 };
const modeFactor = (m: DataMode) => (m === "forecast" ? 1.08 : 1);
const scopeFactor = (branchId: string | "all") => (branchId === "all" ? 1 : (branchWeight[branchId] ?? 0.1) * 1.4);

/* ---------- stock ---------- */

export function statusOf(qty: number, p: Product): StockStatus {
  if (qty <= 0) return "out";
  if (qty < p.minStock) return "low";
  if (qty > p.maxStock) return "over";
  return "ok";
}

export function getStock(branchId: string | "all"): StockItem[] {
  const products = getProducts();
  const suggestions = allRestockSuggestions("all");
  const list = branchId === "all" ? branches : branches.filter((b) => b.id === branchId);
  const items: StockItem[] = [];
  for (const b of list) {
    for (const p of products) {
      const seed = seedOf(p.id)!;
      const qty = stockQuantity(p.id, b.id, seed.maxStock); // physical stock is fixed; min/max edits move the status
      const demand = Math.max(0.1, dailyDemand(p.id, b.id));
      const sug = suggestions.find((s) => s.productId === p.id && s.branchId === b.id);
      items.push({
        productId: p.id,
        branchId: b.id,
        quantity: qty,
        coverageDays: Math.round((qty / demand) * 10) / 10,
        status: statusOf(qty, p),
        nextRestock: sug ? sug.suggestedDate : null,
      });
    }
  }
  return items;
}

/* ---------- restock ---------- */

export function getRestockSuggestions(branchId: string | "all"): RestockSuggestion[] {
  return allRestockSuggestions(branchId).filter((s) => !isSent(s.id));
}

// includes suggestions already ordered (used for stock/calendar dates)
export function allRestockSuggestions(branchId: string | "all"): RestockSuggestion[] {
  const today = todayIso();
  const products = getProducts();
  const sups = getSuppliers();
  const out: RestockSuggestion[] = [];
  for (const b of branches) {
    if (branchId !== "all" && b.id !== branchId) continue;
    for (const p of products) {
      const seed = seedOf(p.id)!;
      const qty = stockQuantity(p.id, b.id, seed.maxStock);
      const status = statusOf(qty, p);
      const spike = seed.trendPct >= 15 && hash01(`${p.id}|${b.id}|spike`) > 0.45;
      if (status !== "out" && status !== "low" && !spike) continue;
      const sup = sups.find((s) => s.id === p.supplierId) ?? sups[0];
      const need = Math.max(p.maxStock - qty, p.caseSize);
      const suggestedQty = Math.ceil(need / p.caseSize) * p.caseSize;
      const demand = dailyDemand(p.id, b.id);
      const reasons: RestockSuggestion["reasons"] = [];
      if (status === "out") reasons.push("stockout");
      else if (status === "low") reasons.push("below_min");
      if (spike) reasons.push("demand_spike");
      out.push({
        id: `rs-${p.id}-${b.id}`,
        productId: p.id,
        branchId: b.id,
        supplierId: sup.id,
        suggestedQty,
        suggestedDate: addDays(today, status === "out" ? sup.leadTimeDays : sup.leadTimeDays + 1),
        reasons,
        expectedLostSalesIfSkipped: Math.round(demand * (sup.leadTimeDays + 5) * p.price * (status === "out" ? 0.9 : 0.5)),
        expectedGainIfOrdered: Math.round(suggestedQty * 0.7 * (p.price - p.unitCost)),
      });
    }
  }
  return out.sort((a, b) => b.expectedLostSalesIfSkipped - a.expectedLostSalesIfSkipped);
}

export const isSent = (suggestionId: string) =>
  getState().orders.some((o) => o.suggestionId === suggestionId && o.status === "sent");

/* ---------- trends ---------- */

export function getTrend(productId: string, branchId: string | "all", promoDiscount?: number): TrendPoint[] {
  const seed = seedOf(productId);
  if (!seed) return [];
  const today = todayIso();
  const base = dailyDemand(productId, branchId);
  const pts: TrendPoint[] = [];
  const wave = (i: number) => 1 + 0.12 * Math.sin(i / 2.2) + (hash01(`${productId}${branchId}${i}`) - 0.5) * 0.14;
  for (let i = -29; i <= 0; i++) {
    const growth = 1 + (seed.trendPct / 100) * ((i + 29) / 29) * 0.5;
    pts.push({ date: addDays(today, i), value: Math.round(base * growth * wave(i) * 10) / 10, kind: "history" });
  }
  const promo = promoSeeds.find((s) => s.productId === productId && (branchId === "all" || s.branchId === branchId))
    ?? promoSeeds.find((s) => s.productId === productId);
  const input = promo ? promoInput(promo) : undefined;
  const d = promoDiscount ?? (input ? optimalDiscount(input) : 0);
  const uplift = 1 + 0.7 * (1 - Math.exp(-d / 14));
  const startIdx = promo ? promo.startOffset : 3;
  const endIdx = promo ? promo.startOffset + promo.durationDays - 1 : 9;
  for (let i = 1; i <= WINDOW_DAYS; i++) {
    // forecast eases from the current level toward the expected window demand
    const ease = promo ? 1 - (1 - promo.windowFactor) * Math.min(1, i / 5) : 1;
    const f = base * (1 + (seed.trendPct / 100) * (0.5 + i / 28)) * wave(i + 40) * ease;
    pts.push({ date: addDays(today, i), value: Math.round(f * 10) / 10, kind: "forecast" });
    const inWin = i >= startIdx && i <= endIdx;
    pts.push({ date: addDays(today, i), value: Math.round(f * (inWin ? uplift : 1) * 10) / 10, kind: "forecast_promo" });
  }
  return pts;
}

export function promoWindowFor(productId: string, branchId: string | "all") {
  const p = getPromos().find((x) => x.productId === productId && (branchId === "all" || x.branchId === branchId))
    ?? getPromos().find((x) => x.productId === productId);
  return p ? { start: p.startDate, end: p.endDate } : null;
}

/* ---------- dashboard ---------- */

export function getKpis(branchId: string | "all", mode: DataMode, range: RangeKey): Kpis {
  const items = getStock(branchId);
  const f = scopeFactor(branchId) * rangeFactor[range] * modeFactor(mode);
  const stockouts = items.filter((i) => i.status === "out").length;
  const noDemand = items.filter((i) => {
    const seed = seedOf(i.productId)!;
    return seed.trendPct <= -8 && i.status !== "out";
  }).length;
  const promos = getPromos().filter((p) => (branchId === "all" || p.branchId === branchId) && p.status !== "dismissed");
  const restock = getRestockSuggestions(branchId);
  const gain = promos.reduce((a, p) => a + Math.max(0, promoGain(p)), 0) + restock.reduce((a, r) => a + r.expectedGainIfOrdered * 0.3, 0);
  const seedH = hash01(`${branchId}|${range}|${mode}`);
  return {
    averageTicket: Math.round((168 + seedH * 14) * (mode === "forecast" ? 1.04 : 1) * (branchId === "all" ? 1 : 0.97 + hash01(branchId) * 0.08)),
    averageTicketDeltaPct: Math.round((3.1 + seedH * 3 + (mode === "forecast" ? 1.5 : 0)) * 10) / 10,
    stockouts,
    noDemand,
    aiOpportunity: Math.round(gain * Math.max(0.35, f * (branchId === "all" ? 1 : 1))),
  };
}

export function getBehaviors(branchId: string | "all"): BehaviorInsight[] {
  const promos = getPromos();
  const pick = (id: string) => promos.find((p) => p.id === id)!;
  const yog = pick("promo-yogurt");
  const beer = pick("promo-cerveza");
  const leche = getRestockSuggestions("all").find((r) => r.productId === "p-leche" && r.reasons.includes("demand_spike")) ?? getRestockSuggestions("all")[0];
  const all: (BehaviorInsight & { branchId: string })[] = [
    { id: "bh-waste", kind: "waste", title: "Yogurt natural con excedente", text: "Sucursal Centro tiene stock para 2.5× la demanda esperada antes de caducar. Una promoción del " + yog.optimalDiscountPct + "% recupera utilidad.", estimatedGain: promoGain(yog), productId: "p-yogurt", branchId: yog.branchId },
    { id: "bh-cross", kind: "crosssell", title: "Cerveza + papas fritas", text: "El 42% de los tickets con cerveza incluye botana. Un combo de fin de semana sube el ticket promedio.", estimatedGain: promoGain(beer), productId: "p-cerveza", branchId: beer.branchId },
    { id: "bh-demand", kind: "demand", title: "Demanda en alza: leche entera", text: "La demanda crece 22% en las últimas semanas; conviene adelantar el pedido para evitar quiebres.", estimatedGain: leche?.expectedGainIfOrdered ?? 0, productId: "p-leche", branchId: leche?.branchId ?? "b-centro" },
  ];
  const scoped = branchId === "all" ? all : all.map((b) => (b.branchId === branchId ? b : { ...b, estimatedGain: Math.round(b.estimatedGain * 0.35) }));
  return scoped.map(({ branchId: _b, ...rest }) => { void _b; return rest; });
}

export function getHeat(productId: string | null): BranchHeat[] {
  return branches.map((b) => {
    const movement = productId
      ? Math.round(20 + hash01(`${productId}|${b.id}|heat`) * 80 * (0.6 + (branchWeight[b.id] ?? 0.1) * 2))
      : Math.round(25 + (branchWeight[b.id] ?? 0.1) * 330 * (0.8 + hash01(`${b.id}|h`) * 0.4));
    return { branchId: b.id, productId, movement: Math.min(100, movement) };
  });
}

export type ProductRow = { productId: string; unitsPerDay: number; trendPct: number };
export function getProductRows(branchId: string | "all", mode: DataMode, range: RangeKey): ProductRow[] {
  return productSeeds.map((p) => ({
    productId: p.id,
    unitsPerDay: Math.round(dailyDemand(p.id, branchId) * modeFactor(mode) * (0.9 + rangeFactor[range] * 0.1)),
    trendPct: Math.round(p.trendPct * (mode === "forecast" ? 1.15 : 1)),
  }));
}

/* ---------- calendar ---------- */

const dayNames: Record<string, number> = { Dom: 0, Lun: 1, Mar: 2, "Mié": 3, Jue: 4, Vie: 5, "Sáb": 6 };

export function nextDeliveryDate(sup: Supplier, from = todayIso()): string {
  const wanted = sup.deliveryDays.split("/").map((d) => dayNames[d.trim()]).filter((n) => n !== undefined);
  for (let i = sup.leadTimeDays; i < sup.leadTimeDays + 8; i++) {
    const d = addDays(from, i);
    if (wanted.includes(parseIso(d).getDay())) return d;
  }
  return addDays(from, sup.leadTimeDays);
}

export function getCalendarEvents(branchId: string | "all"): CalendarEvent[] {
  const today = todayIso();
  const sups = getSuppliers();
  const prods = getProducts();
  const events: CalendarEvent[] = [];
  const sugg = allRestockSuggestions(branchId);
  const sentIds = new Set(getState().orders.filter((o) => o.status === "sent").map((o) => o.suggestionId));
  const seen = new Set<string>();
  for (const s of sugg) {
    const sup = sups.find((x) => x.id === s.supplierId);
    const date = sentIds.has(s.id) ? s.suggestedDate : nextDeliveryDate(sup ?? sups[0], today);
    const key = `${date}|${s.supplierId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ id: `ev-del-${key}`, date, kind: "delivery", label: `Entrega ${sup?.name ?? ""}`, branchId: s.branchId, productId: s.productId });
  }
  for (const p of getPromos()) {
    if (p.status === "dismissed") continue;
    if (branchId !== "all" && p.branchId !== branchId) continue;
    const prod = prods.find((x) => x.id === p.productId);
    events.push({
      id: `ev-${p.id}`,
      date: p.startDate,
      kind: "promo",
      label: `${p.status === "accepted" ? "✓ " : ""}Promo ${prod?.name ?? ""} −${p.discountPct}%`,
      productId: p.productId,
      branchId: p.branchId,
    });
  }
  for (const it of getStock(branchId)) {
    if (it.status === "out" || (it.status === "low" && it.coverageDays < 2.5)) {
      const prod = prods.find((x) => x.id === it.productId);
      events.push({
        id: `ev-alert-${it.productId}-${it.branchId}`,
        date: it.status === "out" ? today : addDays(today, Math.max(1, Math.floor(it.coverageDays))),
        kind: "alert",
        label: `Sin stock: ${prod?.name ?? ""}`,
        productId: it.productId,
        branchId: it.branchId,
      });
    }
  }
  return events;
}
