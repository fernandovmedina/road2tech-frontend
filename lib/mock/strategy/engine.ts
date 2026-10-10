import type { DiscountPoint, Strategy, StrategyDriver, StrategyType } from "@/types";
import { t } from "@/lib/labels";
import { hash01 } from "../db";
import type { RawProduct, RawStore, StockRow } from "../db";
import { getState } from "../store";
import { campaignStat, type Ctx } from "./context";
import {
  addDays, clamp, datesBetween, diffDays, dm, hashId, mxn, n1, pct0, pct1, r1, r2, rangeLabel,
} from "./util";

// Simulated optimizer / simulator ("the backend engine"). The REAL backend owns all of this; the frontend never
// calculates money. The mock derives every figure from the sample dataset: real stock, real prices/costs, real
// affinity pairs, real calendar/weather and the observed lift of the real campaigns (treatment vs control).

/* ---------- policy (mock business constraints) ---------- */

const TYPE_POLICY: Record<StrategyType, { cap: number; minMargin: number; attach: number }> = {
  affinity_combo: { cap: 0.2, minMargin: 0.15, attach: 0.85 },
  rescue_bundle: { cap: 0.35, minMargin: 0.08, attach: 0.6 },
  contextual_offer: { cap: 0.25, minMargin: 0.15, attach: 0 },
};
/** Discount budget per strategy by store size (MXN of price given away). */
const BUDGET_BY_SIZE: Record<string, number> = { small: 250, medium: 400, large: 600 };
const K = 0.08; // saturation scale of the discount response
const MAX_SEARCH = 0.4;
const MIN_IMPACT = 20; // MXN: below this a strategy is not worth showing
const RISK_MAX = 0.65;
export const waste_horizon_days = 21;

function categoryCap(p: RawProduct, typeCap: number): { cap: number; label: string | null } {
  if (p.category_id === "C12") return { cap: 0, label: "Los cigarros no admiten descuentos (tope 0 %)" };
  if (p.category_id === "C02") return { cap: Math.min(typeCap, 0.1), label: "Bebidas alcohólicas: tope de descuento de 10 %" };
  return { cap: typeCap, label: null };
}

/* ---------- specs, preparation ---------- */

export type Spec = {
  storeId: string;
  type: StrategyType;
  promotedId: string;
  anchorId: string | null;
  start: string;
  end: string;
  drivers: StrategyDriver[];
  /** Spanish facts about the context, used by the explanation. */
  notes: string[];
  /** Multiplier of the promo elasticity caused by the context (1 = none). */
  liftBoost: number;
  pair?: { pctTickets: number; lift: number; tickets: number };
  /** Stable key (ids, deterministic noise). */
  key: string;
  /** User/chat cap on the discount (fraction). */
  maxDiscountOverride?: number;
  /** Demo helper: raise the margin floor so the strategy is rejected by a constraint. */
  minMarginOverride?: number;
  /** Window already in the past (measured strategies): stock is not a limit. */
  past?: boolean;
  /** Title hint for contextual offers. */
  titleHint?: string;
  /** Minimum incremental margin (MXN) for the strategy to be worth showing; default 20. User requests use less. */
  minImpact?: number;
};

type Prep = {
  spec: Spec;
  store: RawStore;
  p: RawProduct;
  a: RawProduct | null;
  pRow: StockRow;
  aRow: StockRow | null;
  pCost: number;
  aCost: number;
  dates: string[];
  dailyP: number;
  dailyA: number;
  U0p: number;
  U0a: number;
  availP: number;
  availA: number;
  dE: number | null;
  L: number;
  dRef: number;
  cv: number;
  liftObserved: number;
  attach: number;
  caps: { max: number; maxLabel: string | null; minMargin: number; budget: number };
};

/** Seasonal weight of one day for one product: weekday/weekend (zone), payday, calendar hint and weather. */
export function dayFactor(ctx: Ctx, store: RawStore, p: RawProduct, date: string): number {
  const row = ctx.calendar.get(date);
  const wm = ctx.weekendMultiplier.get(store.zone_type) ?? 1;
  const norm = (5 + 2 * wm) / 7; // keep the weekly mean at 1 because predicted_daily_demand is already a daily mean
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekend = row ? row.is_weekend === 1 : dow === 0 || dow === 6;
  let f = (weekend ? wm : 1) / norm;
  if (row) {
    if (row.demand_multiplier_hint) f *= row.demand_multiplier_hint;
    if (row.is_payday) f *= 1.08;
    if (p.weather_sensitivity === "hot") f *= row.temp_max_c >= 28 ? 1.15 : row.temp_max_c >= 25 ? 1.05 : 1;
    if (p.weather_sensitivity === "cold") f *= row.temp_min_c <= 12 ? 1.12 : row.temp_min_c <= 15 ? 1.05 : 1;
  }
  return f;
}

function prepare(ctx: Ctx, spec: Spec): Prep | null {
  const store = ctx.storeById.get(spec.storeId);
  const p = ctx.productById.get(spec.promotedId);
  const pRow = ctx.stockByKey.get(`${spec.storeId}|${spec.promotedId}`);
  const pc = ctx.costByProduct.get(spec.promotedId);
  if (!store || !p || !pRow || !pc) return null;
  const a = spec.anchorId ? (ctx.productById.get(spec.anchorId) ?? null) : null;
  const aRow = spec.anchorId ? (ctx.stockByKey.get(`${spec.storeId}|${spec.anchorId}`) ?? null) : null;
  const ac = spec.anchorId ? ctx.costByProduct.get(spec.anchorId) : undefined;
  if (spec.anchorId && (!a || !aRow || !ac)) return null;

  const dates = datesBetween(spec.start, spec.end);
  const dailyP = Math.max(0.1, pRow.predicted_daily_demand);
  const dailyA = aRow ? Math.max(0.1, aRow.predicted_daily_demand) : 0;
  const U0p = dates.reduce((s, d) => s + dailyP * dayFactor(ctx, store, p, d), 0);
  const U0a = a ? dates.reduce((s, d) => s + dailyA * dayFactor(ctx, store, a, d), 0) : 0;
  const inbound = (row: StockRow) => (row.next_eta && row.next_eta <= spec.end ? row.on_order_qty : 0);
  const availP = spec.past ? Infinity : pRow.quantity + inbound(pRow);
  const availA = spec.past || !aRow ? Infinity : aRow.quantity + inbound(aRow);
  const dE = pRow.earliest_expiry ? diffDays(ctx.asOf, pRow.earliest_expiry) : null;

  const stat = campaignStat(ctx, spec.type, spec.promotedId);
  const noise = 0.85 + 0.3 * hash01(`${spec.storeId}|${spec.key}|lift`);
  const L = clamp(stat.lift * spec.liftBoost * noise, 0.02, 0.9);
  const policy = TYPE_POLICY[spec.type];
  const catCap = categoryCap(p, policy.cap);
  let max = catCap.cap;
  let maxLabel = catCap.label;
  if (spec.maxDiscountOverride !== undefined && spec.maxDiscountOverride < max) {
    max = spec.maxDiscountOverride;
    maxLabel = null;
  }
  return {
    spec, store, p, a, pRow, aRow,
    pCost: pc.unit_cost, aCost: ac?.unit_cost ?? 0,
    dates, dailyP, dailyA, U0p, U0a, availP, availA, dE,
    L, dRef: stat.discount, cv: stat.lift > 0 ? stat.sd / stat.lift : 0.4, liftObserved: stat.lift,
    attach: policy.attach,
    caps: {
      max, maxLabel,
      minMargin: spec.minMarginOverride ?? policy.minMargin,
      budget: BUDGET_BY_SIZE[store.size_category] ?? 400,
    },
  };
}

/* ---------- scenario math ---------- */

type Scn = { units: number; net_revenue: number; margin: number; waste_units: number; waste_cost: number; stockout_risk: number };
type Detail = Scn & { soldP: number; extraP: number; demandP: number; demandA: number; discountSpend: number };

const g = (x: number) => 1 - Math.exp(-x / K);

function wasteUnits(prep: Prep, extraSold: number): number {
  const { dE, pRow, dailyP } = prep;
  if (dE === null || dE > waste_horizon_days || dE <= 0) return 0;
  return Math.max(0, pRow.quantity - dailyP * dE - extraSold);
}

function scenario(prep: Prep, d: number, capStock: boolean): Detail {
  const { p, a, pCost, aCost } = prep;
  const lift = d > 0 ? (prep.L * g(d)) / g(prep.dRef) : 0;
  const demandP = prep.U0p * (1 + lift);
  const baseSoldP = capStock ? Math.min(prep.U0p, prep.availP) : prep.U0p;
  const soldP = capStock ? Math.min(demandP, prep.availP) : demandP;
  const extraP = Math.max(0, soldP - baseSoldP);
  const demandA = a ? prep.U0a + prep.attach * (demandP - prep.U0p) : 0;
  const soldA = a ? (capStock ? Math.min(demandA, prep.availA) : demandA) : 0;
  const priceEff = p.retail_price * (1 - d);
  // Single-product offers also lift the rest of the basket a little (halo) when nobody is anchored.
  const halo = a ? 0 : 0.3 * extraP;
  const revenue = soldP * priceEff + (a ? soldA * a.retail_price : 0) + halo * p.retail_price;
  const margin = soldP * (priceEff - pCost) + (a ? soldA * (a.retail_price - aCost) : 0) + halo * (p.retail_price - pCost);
  const wu = wasteUnits(prep, extraP);
  const ratio = demandP / Math.max(prep.availP, 1e-6);
  const risk = prep.availP <= 0 ? 1 : 1 / (1 + Math.exp(-6 * (ratio - 1)));
  return {
    units: r1(soldP + soldA), net_revenue: r2(revenue), margin: r2(margin),
    waste_units: r1(wu), waste_cost: r2(wu * pCost), stockout_risk: r2(risk),
    soldP, extraP, demandP, demandA, discountSpend: soldP * p.retail_price * d,
  };
}

const netOf = (s: Scn) => s.margin - s.waste_cost;
const marginPct = (prep: Prep, d: number) => {
  const price = prep.p.retail_price * (1 - d);
  return (price - prep.pCost) / price;
};

type Violation = { code: string; message: string; limit?: number; actual?: number };

function violationsAt(prep: Prep, d: number, treated: Detail): Violation[] {
  const v: Violation[] = [];
  if (d > prep.caps.max + 1e-9)
    v.push({
      code: "max_discount",
      message: prep.caps.maxLabel ?? `El descuento óptimo (${pct0(d)}) supera el tope de ${pct0(prep.caps.max)} de esta estrategia.`,
      limit: r2(prep.caps.max), actual: r2(d),
    });
  const mp = marginPct(prep, d);
  if (mp < prep.caps.minMargin)
    v.push({
      code: "min_margin",
      message: `Con ${pct0(d)} de descuento el margen sobre el precio baja a ${pct1(mp)} y el mínimo es ${pct1(prep.caps.minMargin)}.`,
      limit: r2(prep.caps.minMargin), actual: r2(mp),
    });
  if (treated.discountSpend > prep.caps.budget)
    v.push({
      code: "budget",
      message: `El descuento cuesta ${mxn(treated.discountSpend)} y el presupuesto de la estrategia es ${mxn(prep.caps.budget)}.`,
      limit: prep.caps.budget, actual: r2(treated.discountSpend),
    });
  if (treated.demandP > prep.availP * 1.0001)
    v.push({
      code: "stock_available",
      message: `La demanda esperada con la promoción (${n1(treated.demandP)} u) supera el stock disponible (${n1(prep.availP)} u).`,
      limit: r1(prep.availP), actual: r1(treated.demandP),
    });
  else if (prep.a && treated.demandA > prep.availA * 1.0001)
    v.push({
      code: "stock_available",
      message: `La demanda esperada del producto ancla (${n1(treated.demandA)} u) supera su stock disponible (${n1(prep.availA)} u).`,
      limit: r1(prep.availA), actual: r1(treated.demandA),
    });
  if (treated.stockout_risk > RISK_MAX)
    v.push({
      code: "stockout_risk",
      message: `El riesgo de quiebre con la promoción (${pct0(treated.stockout_risk)}) supera el máximo de ${pct0(RISK_MAX)}.`,
      limit: RISK_MAX, actual: treated.stockout_risk,
    });
  return v;
}

/* ---------- optimizer ---------- */

export type Evaluated = {
  spec: Spec;
  outcome: "viable" | "rejected" | "dropped";
  discount: number;
  /** expected_margin_increment (relaxed value when rejected). */
  impact: number;
  strategy: Strategy;
};

function grid(): number[] {
  const out: number[] = [];
  for (let i = 2; i <= MAX_SEARCH * 100; i++) out.push(i / 100);
  return out;
}
const GRID = grid();

export function evaluateSpec(ctx: Ctx, spec: Spec, createdAt: string, status: Strategy["status"] = "selected"): Evaluated | null {
  const prep = prepare(ctx, spec);
  if (!prep) return null;
  if (prep.dE !== null && prep.dE <= 1 && !spec.past) return null; // nothing left to rescue / sell

  const base = scenario(prep, 0, true);
  const baseNet = netOf(base);
  const baseRelaxed = scenario(prep, 0, false);
  const baseRelaxedNet = netOf(baseRelaxed);

  // 1. What the engine WOULD do without constraints (unlimited stock, no margin floor / cap / budget).
  let dStar = 0;
  let incStar = -Infinity;
  for (const d of GRID) {
    const inc = netOf(scenario(prep, d, false)) - baseRelaxedNet;
    if (inc > incStar) {
      incStar = inc;
      dStar = d;
    }
  }
  const minImpact = spec.minImpact ?? MIN_IMPACT;
  if (incStar < minImpact) return null; // not worth anything even in the best case

  // 2. Best feasible discount.
  let dBest = 0;
  let incBest = -Infinity;
  let best: Detail | null = null;
  for (const d of GRID) {
    const s = scenario(prep, d, true);
    if (violationsAt(prep, d, s).length > 0) continue;
    const inc = netOf(s) - baseNet;
    if (inc > incBest) {
      incBest = inc;
      dBest = d;
      best = s;
    }
  }

  const viable = best !== null && incBest >= minImpact;
  const d = viable ? dBest : dStar;
  const treated = viable ? best! : scenario(prep, dStar, false);
  const baseline: Scn = viable ? base : baseRelaxed;
  const violations = viable ? [] : violationsAt(prep, dStar, scenario(prep, dStar, true));
  if (!viable && violations.length === 0) return null; // would have been viable; numerical edge
  const strategy = buildStrategy(prep, d, baseline, treated, violations, createdAt, viable ? status : "rejected");
  register(strategy.draft_id, { spec, createdAt, relaxed: !viable, optimal: d });
  return { spec, outcome: viable ? "viable" : "rejected", discount: d, impact: strategy.expected_margin_increment, strategy };
}

/* ---------- strategy assembly ---------- */

const productLabel = (p: RawProduct) => p.product_name;

function strip(d: Detail): Scn {
  return {
    units: d.units, net_revenue: d.net_revenue, margin: d.margin,
    waste_units: d.waste_units, waste_cost: d.waste_cost, stockout_risk: d.stockout_risk,
  };
}

/** Scenario as published: the margin is net of the waste cost, so treated.margin - baseline.margin = expected_margin_increment. */
const published = (s: Scn): Scn => ({
  units: s.units, net_revenue: s.net_revenue, margin: r2(netOf(s)),
  waste_units: s.waste_units, waste_cost: s.waste_cost, stockout_risk: s.stockout_risk,
});

function titleOf(prep: Prep): string {
  const { spec, p, a } = prep;
  if (spec.type === "affinity_combo") return `Combo ${productLabel(a!)} + ${productLabel(p)}`;
  if (spec.type === "rescue_bundle") return `${productLabel(p)}: rescate con ${productLabel(a!)}`;
  return `Oferta de ${productLabel(p)}${spec.titleHint ? ` ${spec.titleHint}` : ""}`;
}

type Figures = {
  incMargin: number; incUnits: number; incSales: number; wasteRed: number;
  ci: { low: number; high: number; level: number };
};

/** Increments and confidence interval of a treated scenario against the baseline (same math for a strategy and a curve point). */
function figures(prep: Prep, baseline: Scn, treated: Scn): Figures {
  const incMargin = r2(r2(netOf(treated)) - r2(netOf(baseline)));
  const u = clamp(prep.cv, 0.18, 0.4) * (0.85 + 0.3 * hash01(`${prep.spec.storeId}|${prep.spec.key}|ci`));
  const lo = r2(incMargin * (1 - 1.28 * u));
  const hi = r2(incMargin * (1 + 1.28 * u));
  return {
    incMargin,
    incUnits: r1(treated.units - baseline.units),
    incSales: r2(treated.net_revenue - baseline.net_revenue),
    wasteRed: r2(baseline.waste_cost - treated.waste_cost),
    ci: { low: Math.min(lo, hi), high: Math.max(lo, hi), level: 0.8 },
  };
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/[\s,;:(]+\S*$/, "")}…`);
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BLOCKER_ES: Record<string, string> = {
  max_discount: "supera el descuento máximo permitido",
  min_margin: "deja menos margen del mínimo",
  budget: "excede el presupuesto de descuentos",
  stock_available: "no alcanza el stock",
  stockout_risk: "hay mucho riesgo de quedarte sin stock",
};

function buildStrategy(
  prep: Prep, d: number, baseline: Scn, treatedD: Detail, violations: Violation[], createdAt: string,
  status: Strategy["status"],
): Strategy {
  const { spec, p, a } = prep;
  const treated = strip(treatedD);
  const { incMargin, incUnits, incSales, wasteRed, ci } = figures(prep, baseline, treated);

  const lift = pct0(prep.liftObserved);
  const refDisc = pct0(prep.dRef);
  const dailyP = n1(prep.dailyP);
  const extra = n1(Math.max(0, incUnits));
  const gainTxt = `Con ${pct0(d)} de descuento se venderían ${extra} unidades más y ganarías ${mxn(incMargin)} extra.`;
  const campaigns = `Campañas anteriores: +${lift} de ventas con ${refDisc} de descuento.`;
  const wasteNote = "La ganancia extra ya descuenta la merma.";
  let intro: string;
  let result: string;
  const assumptions: string[] = [];
  if (spec.type === "affinity_combo" && spec.pair) {
    intro = `${productLabel(a!)} y ${productLabel(p)} se compran juntos (${n1(spec.pair.lift)} veces más de lo normal).`;
    result = gainTxt;
    assumptions.push(`Se compraron juntos en ${spec.pair.tickets} tickets de los últimos 30 días.`, campaigns, wasteNote);
  } else if (spec.type === "rescue_bundle") {
    const expiry = dm(prep.pRow.earliest_expiry ?? spec.end);
    intro = `${productLabel(p)} caduca el ${expiry}: sin acción se perderían ${n1(baseline.waste_units)} de ${prep.pRow.quantity} piezas (${mxn(baseline.waste_cost)}).`;
    result = `Con ${pct0(d)} de descuento junto a ${productLabel(a!)} se venden ${extra} más y se evitan ${mxn(Math.max(0, wasteRed))} de merma.`;
    assumptions.push(`Caduca el ${expiry} y se venden unas ${dailyP} piezas al día.`, campaigns, wasteNote);
  } else {
    intro = `${cap1(spec.notes.join(", "))}.`;
    result = gainTxt;
    assumptions.push(`Demanda base: ${dailyP} piezas al día, ajustada por calendario y clima.`, campaigns, wasteNote);
  }
  const blockers = [...new Set(violations.map((v) => BLOCKER_ES[v.code] ?? v.message.replace(/\.$/, "")))].join(" y ");
  const explanation =
    status === "rejected" && violations.length
      ? clip(`${intro.replace(/\.$/, "")}, pero no se puede ejecutar: ${blockers}.`, 220)
      : clip(`${intro} ${result}`, 220);

  return {
    draft_id: `dr_${spec.storeId}_${hashId(`${spec.key}|${spec.start}|${spec.end}`)}`,
    store_id: spec.storeId,
    status,
    strategy_type: spec.type,
    title: titleOf(prep),
    anchor_product_id: spec.anchorId,
    promoted_product_id: spec.promotedId,
    period: { start_date: spec.start, end_date: spec.end },
    proposed_discount_pct: d,
    constraints: {
      min_margin_pct: r2(prep.caps.minMargin),
      max_discount_pct: r2(prep.caps.max),
      budget_mxn: prep.caps.budget,
      satisfied: violations.length === 0,
      violations,
    },
    assumptions,
    baseline: published(baseline),
    treated: published(treated),
    expected_units_increment: incUnits,
    expected_sales_increment: incSales,
    expected_margin_increment: incMargin,
    expected_waste_reduction: wasteRed,
    confidence_interval: ci,
    explanation,
    drivers: spec.drivers,
    created_at: createdAt,
    approved_at: null,
    measurement: null,
    requires_approval: true,
  };
}

/* ---------- registry, discount curve and re-simulation ---------- */

/** What is needed to re-run the engine for an existing draft at another discount. */
type Registered = {
  spec: Spec;
  createdAt: string;
  /** Rejected by a constraint: its numbers come from the unconstrained scenario (unlimited stock). */
  relaxed: boolean;
  /** Discount the engine published at origin (before any user override). */
  optimal: number;
};

const registry = new Map<string, Registered>();

function register(draftId: string, r: Registered) {
  registry.set(draftId, r);
}

/** Registered draft; chat drafts survive a page reload through the session state (`chatSpecs`). */
export function registeredOf(draftId: string): Registered | undefined {
  const mem = registry.get(draftId);
  if (mem) return mem;
  const saved = getState().chatSpecs[draftId];
  if (!saved || typeof saved !== "object") return undefined;
  const r = saved as Registered;
  registry.set(draftId, r);
  return r;
}

export const MAX_DISCOUNT_CAP = 0.4;

/** Highest discount a user may choose for a draft (fraction): its constraint cap, never above 40 %. */
export function maxDiscountOf(s: Strategy): number {
  const m = s.constraints.max_discount_pct;
  return Math.min(MAX_DISCOUNT_CAP, m === null ? MAX_DISCOUNT_CAP : m);
}

/** Same strategy re-simulated at discount `d` (status, approval date and measurement are kept). Null if it cannot be re-run. */
export function resimulate(ctx: Ctx, s: Strategy, d: number): Strategy | null {
  const reg = registeredOf(s.draft_id);
  if (!reg || reg.relaxed) return null;
  const prep = prepare(ctx, reg.spec);
  if (!prep) return null;
  const treated = scenario(prep, d, true);
  const rebuilt = buildStrategy(prep, d, scenario(prep, 0, true), treated, violationsAt(prep, d, treated), reg.createdAt, "selected");
  return { ...rebuilt, status: s.status, approved_at: s.approved_at, created_at: s.created_at, measurement: s.measurement };
}

/**
 * Optimal discount and the full curve (one point per 1 % from 0 to the draft's maximum) of a draft. Every point is
 * computed with the same scenario math as the strategy itself, so the point of the current discount matches it exactly.
 * Strategies rejected by a constraint use the unconstrained scenario and extend the curve up to their own discount.
 */
export function discountCurve(ctx: Ctx, s: Strategy): { optimal: number; points: DiscountPoint[] } | null {
  const reg = registeredOf(s.draft_id);
  if (!reg) return null;
  const prep = prepare(ctx, reg.spec);
  if (!prep) return null;
  const capStock = !reg.relaxed;
  const baseline = strip(scenario(prep, 0, capStock));
  let top = Math.min(MAX_DISCOUNT_CAP, prep.caps.max);
  if (reg.relaxed) top = Math.max(top, Math.min(MAX_DISCOUNT_CAP, reg.optimal));
  const steps = Math.round(top * 100);
  const points: DiscountPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = i / 100;
    const detail = scenario(prep, d, capStock);
    // The slider only offers discounts the engine would accept: stop at the first one that breaks a constraint,
    // so no point of the curve earns more than the published optimum by silently violating a limit.
    if (!reg.relaxed && i > 0 && violationsAt(prep, d, detail).length > 0) break;
    const treated = strip(detail);
    const f = figures(prep, baseline, treated);
    points.push({
      discount_pct: d,
      treated: published(treated),
      expected_units_increment: f.incUnits,
      expected_sales_increment: f.incSales,
      expected_margin_increment: f.incMargin,
      expected_waste_reduction: f.wasteRed,
      confidence_interval: f.ci,
    });
  }
  return { optimal: reg.optimal, points };
}

/** Plain-JSON snapshot of a registered draft (stored with chat drafts so they can be re-simulated after a reload). */
export function exportRegistered(draftId: string): Registered | undefined {
  return registry.get(draftId);
}

/* ---------- candidate generation ---------- */

type CtxWindow = { start: string; end: string; boost: number; drivers: StrategyDriver[]; notes: string[]; hint: string };

function planWindow(ctx: Ctx) {
  return { start: addDays(ctx.asOf, 1), end: addDays(ctx.asOf, 7) };
}

function contextWindows(ctx: Ctx, store: RawStore, p: RawProduct): CtxWindow[] {
  const pw = planWindow(ctx);
  const rows = datesBetween(pw.start, pw.end).flatMap((d) => {
    const r = ctx.calendar.get(d);
    return r ? [r] : [];
  });
  const out: CtxWindow[] = [];
  const cluster = (days: string[], maxLen: number) => {
    const first = days[0];
    const last = days.filter((d) => d <= addDays(first, maxLen - 1)).pop()!;
    return { start: first, end: last };
  };
  const wm = ctx.weekendMultiplier.get(store.zone_type) ?? 1;
  const weekend = rows.filter((r) => r.is_weekend === 1).map((r) => r.date);
  if (weekend.length && wm >= 0.8) {
    const w = cluster(weekend, 2);
    out.push({ ...w, boost: 1, drivers: ["demand"], notes: [`fin de semana (${rangeLabel(w.start, w.end)}) con demanda ×${n1(wm)} en zona ${t("zone", store.zone_type).toLowerCase()}`], hint: "para el fin de semana" });
  }
  if (p.weather_sensitivity === "hot") {
    const hot = rows.filter((r) => r.temp_max_c >= 26);
    if (hot.length) {
      const w = cluster(hot.map((r) => r.date), 4);
      const mx = Math.max(...hot.map((r) => r.temp_max_c));
      out.push({ ...w, boost: 1.35, drivers: ["weather", "demand"], notes: [`calor previsto (máx. ${n1(mx)} °C, ${rangeLabel(w.start, w.end)}) y producto sensible al calor`], hint: "por calor" });
    }
  }
  if (p.weather_sensitivity === "cold") {
    const cold = rows.filter((r) => r.temp_min_c <= 12);
    if (cold.length) {
      const w = cluster(cold.map((r) => r.date), 4);
      const mn = Math.min(...cold.map((r) => r.temp_min_c));
      out.push({ ...w, boost: 1.35, drivers: ["weather", "demand"], notes: [`frío previsto (mín. ${n1(mn)} °C, ${rangeLabel(w.start, w.end)}) y producto sensible al frío`], hint: "por frío" });
    }
  }
  const ev = rows.filter((r) => r.event_name);
  if (ev.length) {
    const w = cluster(ev.map((r) => r.date), 4);
    const names = [...new Set(ev[0].event_name!.split("|"))].map((e) => t("event", e)).join(", ");
    out.push({ ...w, boost: 1.2, drivers: ["event"], notes: [`evento: ${names} (${rangeLabel(w.start, w.end)})`], hint: "por evento" });
  }
  const pay = rows.filter((r) => r.is_payday === 1);
  if (pay.length) {
    const w = cluster(pay.map((r) => r.date), 3);
    out.push({ ...w, boost: 1.15, drivers: ["demand"], notes: [`quincena (${rangeLabel(w.start, w.end)})`], hint: "por quincena" });
  }
  if (p.is_seasonal === 1) {
    const s = rows[0]?.season_name ?? "";
    const w = { start: pw.start, end: addDays(pw.start, 3) };
    out.push({ ...w, boost: 1.2, drivers: ["season"], notes: [`producto de temporada en ${t("season", s).toLowerCase()}`], hint: "de temporada" });
  }
  return out;
}

/** Top-rotation, long-shelf-life products of a store (anchors for bundles). */
function anchorPool(ctx: Ctx, storeId: string, excludeId: string): RawProduct[] {
  const rows = (ctx.stockByStore.get(storeId) ?? [])
    .filter((r) => r.product_id !== excludeId && r.quantity > 0)
    .map((r) => ({ r, p: ctx.productById.get(r.product_id) }))
    .filter((x): x is { r: StockRow; p: RawProduct } => !!x.p && x.p.shelf_life_days >= 90)
    .sort((x, y) => y.r.avg_daily_units_14d - x.r.avg_daily_units_14d);
  return rows.slice(0, 3).map((x) => x.p);
}

/**
 * Rescue bundle for stock that will not sell before it expires, tied to one of the store's fastest sellers.
 * Null when there is nothing to rescue: no expiry date, too close (< 3 days) or too far, long shelf life, or it sells out in time.
 */
export function rescueSpecFor(ctx: Ctx, storeId: string, r: StockRow, gen: number): Spec | null {
  if (r.quantity <= 0 || !r.earliest_expiry) return null;
  const dE = diffDays(ctx.asOf, r.earliest_expiry);
  if (dE < 3 || dE > waste_horizon_days) return null;
  const p = ctx.productById.get(r.product_id);
  if (!p || p.shelf_life_days > 60) return null;
  if (r.quantity - Math.max(0.1, r.predicted_daily_demand) * dE <= 0) return null; // sells out in time: no waste
  const anchors = anchorPool(ctx, storeId, r.product_id);
  if (!anchors.length) return null;
  const anchor = anchors[Math.floor(hash01(`${storeId}|${r.product_id}|${gen}|anc`) * anchors.length)];
  const start = planWindow(ctx).start;
  return {
    storeId, type: "rescue_bundle", promotedId: r.product_id, anchorId: anchor.product_id, start, end: addDays(start, Math.min(4, dE - 2)),
    drivers: ["shelf_life", "demand"], notes: [], liftBoost: 1, key: `res|${r.product_id}|${anchor.product_id}|${gen}`,
  };
}

export function generateSpecs(ctx: Ctx, storeId: string, gen: number): Spec[] {
  const store = ctx.storeById.get(storeId);
  if (!store) return [];
  const specs: Spec[] = [];
  const pw = planWindow(ctx);
  const rows = ctx.stockByStore.get(storeId) ?? [];

  // affinity_combo: real product pairs bought together in this store.
  for (const pair of ctx.affinity.byStore[storeId] ?? []) {
    const offset = Math.floor(hash01(`${storeId}|${pair.a}|${pair.b}|${gen}|off`) * 3);
    const start = addDays(pw.start, offset);
    const end = addDays(start, 3 + Math.floor(hash01(`${storeId}|${pair.a}|${pair.b}|${gen}|len`) * 2));
    specs.push({
      storeId, type: "affinity_combo", promotedId: pair.b, anchorId: pair.a, start, end: end > pw.end ? pw.end : end,
      drivers: ["bought_together", "demand"], notes: [], liftBoost: 1,
      pair: { pctTickets: pair.pctTickets, lift: pair.lift, tickets: pair.tickets },
      key: `aff|${pair.a}|${pair.b}|${gen}`,
    });
  }

  // rescue_bundle: stock that will not sell before it expires, tied to a high-rotation product.
  for (const r of rows) {
    const rescue = rescueSpecFor(ctx, storeId, r, gen);
    if (rescue) specs.push(rescue);
  }

  // contextual_offer: calendar / weather / event driven, one best window per product is chosen later.
  for (const r of rows) {
    const p = ctx.productById.get(r.product_id);
    if (!p || r.quantity <= 0) continue;
    for (const w of contextWindows(ctx, store, p)) {
      specs.push({
        storeId, type: "contextual_offer", promotedId: p.product_id, anchorId: null, start: w.start, end: w.end,
        drivers: w.drivers, notes: w.notes, liftBoost: w.boost, key: `ctx|${p.product_id}|${w.hint}|${gen}`, titleHint: w.hint,
      });
    }
  }
  return specs;
}

/** Evaluate all candidates of a store; contextual ones keep only the best window per product. */
export function evaluateStore(ctx: Ctx, storeId: string, gen: number, createdAt: string): Evaluated[] {
  const out: Evaluated[] = [];
  const bestCtx = new Map<string, Evaluated>();
  for (const spec of generateSpecs(ctx, storeId, gen)) {
    const ev = evaluateSpec(ctx, spec, createdAt);
    if (!ev) continue;
    if (spec.type !== "contextual_offer") {
      out.push(ev);
      continue;
    }
    const cur = bestCtx.get(spec.promotedId);
    const score = ev.outcome === "viable" ? ev.impact : -1;
    const curScore = cur ? (cur.outcome === "viable" ? cur.impact : -1) : -2;
    if (!cur || score > curScore || (score === curScore && ev.impact > cur.impact)) bestCtx.set(spec.promotedId, ev);
  }
  return [...out, ...bestCtx.values()];
}

