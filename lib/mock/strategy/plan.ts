import { strategySchema } from "@/lib/api/schemas";
import type { Plan, Portfolio, Strategy, StrategyAction, StrategyDetail, StrategyStatus } from "@/types";
import { hash01 } from "../db";
import { MockHttpError } from "../errors";
import { getState, mutate } from "../store";
import { loadCtx, type Ctx } from "./context";
import { discountCurve, evaluateSpec, evaluateStore, exportRegistered, maxDiscountOf, resimulate, type Evaluated } from "./engine";
import { computePortfolio, isLive } from "./portfolio";
import { addDays, mxn, r1, r2 } from "./util";

// Plan per store: automatic candidates (engine.ts) + chat drafts + the lifecycle (status overrides of this session).

export const MAX_STRATEGIES = 5;

type BasePlan = {
  /** Strategies of the automatic plan (initial status "selected", a few seeded lifecycle states). */
  live: Strategy[];
  /** Past strategies (measured). */
  history: Strategy[];
  /** Candidates rejected by a constraint (status "rejected" with violations). */
  rejected: Strategy[];
  reason: string | null;
};

const cache = new Map<string, BasePlan>();

export const generationOf = (storeId: string) => getState().planMeta[storeId]?.generation ?? 0;

/* ---------- automatic plan ---------- */

function targetCount(ctx: Ctx, storeId: string, gen: number): number {
  const idx = ctx.stores.findIndex((s) => s.store_id === storeId);
  if (idx === 0 || idx === 1) return MAX_STRATEGIES; // demo stores with a full plan
  if (idx === 2) return 2; // demo store with fewer than five (explained by reason_if_fewer)
  return 3 + Math.floor(hash01(`${storeId}|target|${gen}`) * 3); // 3..5
}

const productsOf = (s: Strategy) => [s.promoted_product_id, ...(s.anchor_product_id ? [s.anchor_product_id] : [])];
const periodsOverlap = (a: Strategy, b: Strategy) => a.period.start_date <= b.period.end_date && b.period.start_date <= a.period.end_date;
const clashes = (a: Strategy, b: Strategy) =>
  a.promoted_product_id === b.promoted_product_id || (periodsOverlap(a, b) && productsOf(a).some((p) => productsOf(b).includes(p)));

function pick(viable: Evaluated[], count: number): Evaluated[] {
  const picked: Evaluated[] = [];
  const free = (e: Evaluated) => !picked.some((p) => clashes(p.strategy, e.strategy));
  // One of each template first (best impact first), so every plan shows variety, then the rest by impact.
  const bestPerType = (["affinity_combo", "rescue_bundle", "contextual_offer"] as const)
    .map((type) => viable.find((e) => e.spec.type === type && free(e)))
    .filter((e): e is Evaluated => !!e)
    .sort((a, b) => b.impact - a.impact);
  for (const e of bestPerType) if (picked.length < count && free(e)) picked.push(e);
  for (const e of viable) if (picked.length < count && !picked.includes(e) && free(e)) picked.push(e);
  return picked.sort((a, b) => b.impact - a.impact);
}

/** Date-derived status of an approved strategy (the real backend does this with its scheduler). */
function approvedStatus(ctx: Ctx, s: Strategy): StrategyStatus {
  if (s.period.end_date < ctx.asOf) return "expired";
  if (s.period.start_date <= ctx.asOf) return "active";
  if (s.period.start_date > addDays(ctx.asOf, 1)) return "scheduled";
  return "approved";
}

function buildBasePlan(ctx: Ctx, storeId: string, gen: number): BasePlan {
  const createdAt = `${ctx.asOf}T06:00:00Z`;
  const evs = evaluateStore(ctx, storeId, gen, createdAt);
  const viable = evs.filter((e) => e.outcome === "viable").sort((a, b) => b.impact - a.impact);
  let rejected = evs.filter((e) => e.outcome === "rejected").sort((a, b) => b.impact - a.impact);
  const idx = ctx.stores.findIndex((s) => s.store_id === storeId);
  const target = targetCount(ctx, storeId, gen);

  // Demo guarantee: the first store always shows a strategy rejected by a constraint, even if the data had none.
  if (idx === 0 && rejected.length === 0 && viable.length > 0) {
    const e = viable[viable.length > 1 ? 1 : 0];
    const p = ctx.productById.get(e.spec.promotedId);
    const c = ctx.costByProduct.get(e.spec.promotedId);
    if (p && c) {
      const floor = Math.max(0.1, (p.retail_price - c.unit_cost) / p.retail_price - 0.01);
      const forced = evaluateSpec(ctx, { ...e.spec, key: `${e.spec.key}|floor`, minMarginOverride: floor }, createdAt);
      if (forced && forced.outcome === "rejected") rejected = [forced];
    }
  }

  const picked = pick(viable, target);
  const live: Strategy[] = picked.map((e) => ({ ...e.strategy }));

  // Seeded lifecycle states so the demo shows the whole cycle (first two demo stores + a few others).
  const history: Strategy[] = [];
  const stamp = (s: Strategy, status: StrategyStatus, daysAgo: number): Strategy => ({
    ...s, status, approved_at: `${addDays(ctx.asOf, -daysAgo)}T10:00:00Z`,
  });
  if (idx === 0 && live.length >= 4) {
    const rewindow = (i: number, start: string, end: string, status: StrategyStatus, daysAgo: number) => {
      const ev = picked[i];
      const re = evaluateSpec(ctx, { ...ev.spec, start, end }, createdAt, status);
      live[i] = re && re.outcome === "viable" ? stamp(re.strategy, status, daysAgo) : stamp(live[i], status === "active" ? "approved" : status, daysAgo);
    };
    // Prefer non-contextual strategies for the "active" one: their dates are not tied to a weather/weekend window.
    // Seed the lowest-impact strategies first so the top of the plan stays "En el plan" and can be tried in the demo.
    const nonCtx = (i: number) => Number(picked[i].spec.type === "contextual_offer");
    const idxs = picked.map((_, i) => i);
    const low = idxs.filter((i) => i >= 3).sort((a, b) => nonCtx(a) - nonCtx(b) || a - b);
    const order = [...low, ...idxs.filter((i) => i < 3).sort((a, b) => b - a)];
    const [iActive, iSched, iAppr] = order.slice(0, 3);
    rewindow(iActive, addDays(ctx.asOf, -1), addDays(ctx.asOf, 3), "active", 3);
    rewindow(iSched, addDays(ctx.asOf, 3), addDays(ctx.asOf, 6), "scheduled", 1);
    live[iAppr] = stamp(live[iAppr], "approved", 0);
    live[iAppr].approved_at = `${ctx.asOf}T09:00:00Z`;
  } else if (live.length >= 2 && idx > 2 && hash01(`${storeId}|appr`) < 0.25) {
    live[1] = stamp(live[1], approvedStatus(ctx, live[1]), 0);
  }
  if (idx === 1) {
    const src = viable.find((e) => e.spec.type !== "contextual_offer" && !picked.includes(e)) ?? viable[0];
    if (src) {
      const past = evaluateSpec(ctx, { ...src.spec, key: `${src.spec.key}|measured`, start: addDays(ctx.asOf, -9), end: addDays(ctx.asOf, -4), past: true }, createdAt, "measured");
      if (past && past.outcome === "viable") {
        const s = past.strategy;
        const h = (k: string) => hash01(`${storeId}|${s.draft_id}|${k}`);
        const ratio = 0.82 + 0.3 * h("u");
        history.push({
          ...s,
          status: "measured",
          approved_at: `${addDays(ctx.asOf, -12)}T10:00:00Z`,
          measurement: {
            measured_at: `${addDays(ctx.asOf, -2)}T07:00:00Z`,
            actual: {
              units: r1(s.treated.units * ratio),
              net_revenue: r2(s.treated.net_revenue * ratio),
              margin: r2(s.treated.margin * ratio * (0.92 + 0.14 * h("m"))),
              waste_units: r1(s.treated.waste_units * (0.9 + 0.3 * h("w"))),
            },
            actual_margin_increment: r2(s.expected_margin_increment * (0.7 + 0.5 * h("i"))),
            control_group_used: true,
          },
        });
      }
    }
  }

  // Why there are fewer than five.
  let reason: string | null = null;
  if (live.length < MAX_STRATEGIES) {
    const rest = viable.filter((e) => !picked.includes(e) && !picked.some((p) => clashes(p.strategy, e.strategy)));
    const rej = rejected.length
      ? ` Además, ${rejected.length === 1 ? "1 candidata fue rechazada" : `${rejected.length} candidatas fueron rechazadas`} por restricciones (margen, stock o riesgo de quiebre).`
      : "";
    if (live.length === 0) reason = `Ninguna de las ${evs.length} candidatas evaluadas cumple las restricciones de margen, stock y riesgo de quiebre esta semana.`;
    else if (rest.length > 0) {
      const thr = Math.round((picked[picked.length - 1].impact + rest[0].impact) / 2 / 10) * 10;
      reason = `Solo ${live.length} de ${viable.length} candidatas viables superan el umbral de impacto mínimo de ${mxn(thr)} sin traslaparse con otra estrategia del plan.${rej}`;
    } else reason = `Solo ${live.length} candidatas cumplen las restricciones de margen, stock y riesgo de quiebre esta semana.${rej}`;
  }

  return { live, history, rejected: rejected.slice(0, 2).map((e) => e.strategy), reason };
}

export async function baseFor(storeId: string): Promise<{ ctx: Ctx; base: BasePlan }> {
  const ctx = await loadCtx();
  if (!ctx.storeById.has(storeId)) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${storeId}`);
  const gen = generationOf(storeId);
  const key = `${storeId}|${gen}`;
  let base = cache.get(key);
  if (!base) {
    base = buildBasePlan(ctx, storeId, gen);
    cache.set(key, base);
  }
  return { ctx, base };
}

/* ---------- lifecycle ---------- */

export function parseDraftStore(draftId: string): string | null {
  const m = /^dr_([^_]+)_/.exec(draftId);
  return m ? m[1] : null;
}

/** Applies this session's status override and the date-derived transitions to a stored strategy. */
export function effective(ctx: Ctx, raw: Strategy): Strategy {
  const st = getState();
  // Discount chosen by the user: the strategy is re-simulated at that discount (baseline unchanged).
  const chosen = st.strategyDiscount[raw.draft_id];
  const s = chosen !== undefined && Math.abs(chosen - raw.proposed_discount_pct) > 1e-9 ? (resimulate(ctx, raw, chosen) ?? raw) : raw;
  const o = st.strategyStatus[s.draft_id];
  let status: StrategyStatus = o?.status ?? s.status;
  const approvedAt = o?.approved_at ?? s.approved_at;
  if (o && status === "approved") status = approvedStatus(ctx, s);
  else if ((status === "selected" || status === "draft") && s.period.end_date < ctx.asOf) status = "expired";
  return status === s.status && approvedAt === s.approved_at ? s : { ...s, status, approved_at: approvedAt };
}

function chatDraftsOf(storeId: string): Strategy[] {
  const out: Strategy[] = [];
  for (const [id, raw] of Object.entries(getState().chatDrafts)) {
    if (parseDraftStore(id) !== storeId) continue;
    const parsed = strategySchema.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Every known strategy of a store with its effective status (automatic + rejected + history + chat drafts). */
export async function allStrategies(storeId: string): Promise<{ ctx: Ctx; base: BasePlan; all: Strategy[]; chatIds: Set<string> }> {
  const { ctx, base } = await baseFor(storeId);
  const chat = chatDraftsOf(storeId);
  const all = [...base.live, ...base.history, ...base.rejected, ...chat].map((s) => effective(ctx, s));
  return { ctx, base, all, chatIds: new Set(chat.map((s) => s.draft_id)) };
}

export function portfolioFor(ctx: Ctx, all: Strategy[]): Portfolio {
  return computePortfolio(ctx, all);
}

const byImpact = (a: Strategy, b: Strategy) => b.expected_margin_increment - a.expected_margin_increment;

export async function getStorePlan(storeId: string, opts: { from?: string; to?: string } = {}): Promise<Plan> {
  const { ctx, base, all, chatIds } = await allStrategies(storeId);
  const live = all.filter((s) => isLive(s.status)).sort(byImpact);
  const history = all.filter((s) => s.status === "measured" || s.status === "expired").sort(byImpact);
  const rejected = all.filter((s) => s.status === "rejected" && !chatIds.has(s.draft_id)).sort(byImpact);
  let reason: string | null = null;
  if (live.length < MAX_STRATEGIES) {
    if (live.length === base.live.length && base.reason) reason = base.reason;
    else if (live.length === 0) reason = "El plan está vacío: se quitaron o rechazaron todas las estrategias. Usa «Regenerar plan» para recalcularlo.";
    else if (base.live.length >= MAX_STRATEGIES || live.length < base.live.length)
      reason = `El plan tiene ${live.length} estrategias porque se quitaron o rechazaron algunas. Usa «Regenerar plan» para recalcularlo.`;
    else reason = base.reason;
  }
  const meta = getState().planMeta[storeId];
  return {
    store_id: storeId,
    period: { from: opts.from ?? addDays(ctx.asOf, 1), to: opts.to ?? addDays(ctx.asOf, 7) },
    generated_at: meta?.generated_at ?? `${ctx.asOf}T06:00:00Z`,
    strategies: [...live, ...history, ...rejected],
    portfolio: computePortfolio(ctx, all),
    reason_if_fewer: reason,
  };
}

export function emptyPlan(ctx: Ctx, storeId: string, opts: { from?: string; to?: string } = {}): Plan {
  return {
    store_id: storeId,
    period: { from: opts.from ?? addDays(ctx.asOf, 1), to: opts.to ?? addDays(ctx.asOf, 7) },
    generated_at: `${ctx.asOf}T06:00:00Z`,
    strategies: [],
    portfolio: { net_expected_margin_increment: 0, confidence_interval: { low: 0, high: 0, level: 0.8 }, conflicts: [] },
    reason_if_fewer: "Sin estrategias viables para esta tienda en el periodo (estado vacío de ejemplo).",
  };
}

/** `strategies:generate`: new plan version for the store; this session's overrides for the store are reset. */
export async function regeneratePlan(storeId: string): Promise<Plan> {
  const ctx = await loadCtx();
  if (!ctx.storeById.has(storeId)) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${storeId}`);
  const prefix = `dr_${storeId}_`;
  mutate((s) => {
    const prev = s.planMeta[storeId]?.generation ?? 0;
    s.planMeta[storeId] = { generation: prev + 1, generated_at: new Date().toISOString() };
    for (const id of Object.keys(s.strategyStatus)) {
      if (id.startsWith(prefix)) {
        delete s.strategyStatus[id];
        delete s.chatDrafts[id]; // chat drafts that were added to the plan leave with the old plan version
      }
    }
    for (const id of Object.keys(s.strategyDiscount)) if (id.startsWith(prefix)) delete s.strategyDiscount[id];
    for (const id of Object.keys(s.chatSpecs)) if (id.startsWith(prefix)) delete s.chatSpecs[id];
  });
  return getStorePlan(storeId);
}

export type Action = "add-to-plan" | "approve" | "reject";

const STATUS_ES: Record<StrategyStatus, string> = {
  draft: "Borrador", selected: "En el plan", approved: "Aprobada", scheduled: "Programada", active: "Activa",
  measured: "Medida", expired: "Expirada", rejected: "Rechazada",
};

const outOfRange = (msg: string) => new MockHttpError(422, "discount_out_of_range", msg);

/** Reads the optional `discount_pct` of the body of add-to-plan / approve (fraction); undefined when absent. */
export function parseDiscountBody(body: unknown): number | undefined {
  const raw = body && typeof body === "object" ? (body as { discount_pct?: unknown }).discount_pct : undefined;
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw)) throw outOfRange("El descuento debe ser un número entre 0 y 1 (por ejemplo, 0.12 para 12 %).");
  return raw;
}

export async function applyAction(draftId: string, action: Action, discountPct?: number): Promise<StrategyAction> {
  const storeId = parseDraftStore(draftId);
  if (!storeId) throw new MockHttpError(404, "draft_not_found", `Estrategia desconocida: ${draftId}`);
  const { ctx, all } = await allStrategies(storeId).catch(() => {
    throw new MockHttpError(404, "draft_not_found", `Estrategia desconocida: ${draftId}`);
  });
  const cur = all.find((s) => s.draft_id === draftId);
  if (!cur) throw new MockHttpError(404, "draft_not_found", `Estrategia desconocida: ${draftId}`);

  const invalid = (msg: string) => new MockHttpError(409, "invalid_transition", `${msg} (estado actual: ${STATUS_ES[cur.status]}).`);
  let next: { status: StrategyStatus; approved_at?: string } | null = null;
  if (action === "add-to-plan") {
    if (cur.status === "selected") next = null; // idempotent
    else if (cur.status === "draft") next = { status: "selected" };
    else if (cur.status === "rejected" && !cur.constraints.satisfied) throw invalid("La estrategia fue rechazada por restricciones y no puede agregarse al plan");
    else throw invalid("Solo un borrador puede agregarse al plan");
  } else if (action === "approve") {
    if (["approved", "scheduled", "active"].includes(cur.status)) next = null; // idempotent
    else if (cur.status === "selected") next = { status: "approved", approved_at: new Date().toISOString() };
    else if (cur.status === "draft") throw invalid("Agrega la estrategia al plan antes de aprobarla");
    else throw invalid("Solo una estrategia que está en el plan puede aprobarse");
  } else {
    if (cur.status === "rejected") next = null; // idempotent
    else if (cur.status === "draft" || cur.status === "selected") next = { status: "rejected" };
    else throw invalid("Solo un borrador o una estrategia en el plan puede rechazarse");
  }
  // Optional discount chosen by the user (only while the strategy can still be edited: draft / in the plan).
  let chosen: number | undefined;
  if (discountPct !== undefined && action !== "reject") {
    const d = Math.round(discountPct * 100) / 100; // the curve has one point per 1 %
    if (cur.status === "draft" || cur.status === "selected") {
      const max = maxDiscountOf(cur);
      if (discountPct < 0 || discountPct > max + 1e-9)
        throw outOfRange(`El descuento debe estar entre 0 % y ${Math.round(max * 100)} % para esta estrategia (recibido: ${Math.round(discountPct * 1000) / 10} %).`);
      chosen = d;
    } else if (Math.abs(d - cur.proposed_discount_pct) > 1e-9) {
      throw invalid("Esta estrategia ya no admite cambiar el descuento");
    }
  }
  if (next || chosen !== undefined) {
    const n = next;
    mutate((s) => {
      if (n) s.strategyStatus[draftId] = n;
      if (chosen !== undefined) s.strategyDiscount[draftId] = chosen;
    });
  }
  const { all: updated } = await allStrategies(storeId);
  const strategy = updated.find((s) => s.draft_id === draftId)!;
  return { strategy, portfolio: computePortfolio(ctx, updated) };
}

/** Persists a chat draft (status "draft") so add-to-plan / reject can find it later. */
export function saveChatDraft(strategy: Strategy) {
  const snapshot = exportRegistered(strategy.draft_id);
  mutate((s) => {
    s.chatDrafts[strategy.draft_id] = strategy;
    if (snapshot) s.chatSpecs[strategy.draft_id] = snapshot;
  });
}

/** GET /drafts/{id}: the strategy as it stands (status, chosen discount) plus the engine optimum and the discount curve. */
export async function getDraftDetail(draftId: string): Promise<StrategyDetail> {
  const notFound = () => new MockHttpError(404, "draft_not_found", `Estrategia desconocida: ${draftId}`);
  const storeId = parseDraftStore(draftId);
  if (!storeId) throw notFound();
  const { ctx, all } = await allStrategies(storeId).catch(() => {
    throw notFound();
  });
  const strategy = all.find((s) => s.draft_id === draftId);
  if (!strategy) throw notFound();
  const curve = discountCurve(ctx, strategy);
  if (curve) return { ...strategy, optimal_discount_pct: curve.optimal, discount_curve: curve.points };
  // No engine snapshot (should not happen): a single point with the strategy own numbers.
  return {
    ...strategy,
    optimal_discount_pct: strategy.proposed_discount_pct,
    discount_curve: [
      {
        discount_pct: strategy.proposed_discount_pct,
        treated: strategy.treated,
        expected_units_increment: strategy.expected_units_increment,
        expected_sales_increment: strategy.expected_sales_increment,
        expected_margin_increment: strategy.expected_margin_increment,
        expected_waste_reduction: strategy.expected_waste_reduction,
        confidence_interval: strategy.confidence_interval,
      },
    ],
  };
}

