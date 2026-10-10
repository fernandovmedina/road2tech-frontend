import type { PlanOverlap, Portfolio, Strategy, StrategyStatus } from "@/types";
import type { Ctx } from "./context";
import { dm, overlap, pct0, r2 } from "./util";

// Portfolio impact of a store plan: NOT the naive sum of the cards. Strategies that share a product on overlapping
// dates keep only the higher-impact one; strategies pushing the same category at the same time cannibalize each
// other. The confidence interval combines the individual intervals as independent errors.

/** Statuses that count as "in the plan" for the portfolio. */
export const LIVE_STATUSES: readonly StrategyStatus[] = ["selected", "approved", "scheduled", "active"];
export const isLive = (s: StrategyStatus) => LIVE_STATUSES.includes(s);

const CANNIBALIZATION = 0.12;
const span = (from: string, to: string) => (from === to ? `el ${dm(from)}` : `entre el ${dm(from)} y el ${dm(to)}`);

const productsOf = (s: Strategy) => [s.promoted_product_id, ...(s.anchor_product_id ? [s.anchor_product_id] : [])];
const windowOf = (s: Strategy) => ({ start: s.period.start_date, end: s.period.end_date });

export function computePortfolio(ctx: Ctx, strategies: Strategy[]): Portfolio {
  const live = strategies.filter((s) => isLive(s.status)).sort((a, b) => b.expected_margin_increment - a.expected_margin_increment);
  const factor = new Map<string, number>(live.map((s) => [s.draft_id, 1]));
  const conflicts: Portfolio["conflicts"] = [];

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const hi = live[i];
      const lo = live[j];
      if (factor.get(hi.draft_id) === 0 || factor.get(lo.draft_id) === 0) continue;
      if (!overlap(windowOf(hi), windowOf(lo))) continue;
      const shared = productsOf(hi).filter((p) => productsOf(lo).includes(p));
      const from = hi.period.start_date > lo.period.start_date ? hi.period.start_date : lo.period.start_date;
      const to = hi.period.end_date < lo.period.end_date ? hi.period.end_date : lo.period.end_date;
      if (shared.length) {
        factor.set(lo.draft_id, 0);
        const names = shared.map((id) => ctx.productById.get(id)?.product_name ?? id).join(", ");
        conflicts.push({
          strategy_ids: [hi.draft_id, lo.draft_id],
          type: "overlapping_product",
          description: `Comparten ${names} ${span(from, to)}`,
          resolution: "kept_higher_impact",
        });
        continue;
      }
      const catHi = ctx.productById.get(hi.promoted_product_id)?.category_id;
      const catLo = ctx.productById.get(lo.promoted_product_id)?.category_id;
      if (catHi && catHi === catLo) {
        factor.set(lo.draft_id, (factor.get(lo.draft_id) ?? 1) * (1 - CANNIBALIZATION));
        conflicts.push({
          strategy_ids: [hi.draft_id, lo.draft_id],
          type: "category_cannibalization",
          description: `Ambas promueven la misma categoría ${span(from, to)}; se descuenta ${pct0(CANNIBALIZATION)} de la de menor impacto`,
          resolution: "reduced_lower_impact",
        });
      }
    }
  }

  let net = 0;
  let varLow = 0;
  let varHigh = 0;
  for (const s of live) {
    const f = factor.get(s.draft_id) ?? 1;
    const m = s.expected_margin_increment * f;
    net += m;
    varLow += (f * (s.expected_margin_increment - s.confidence_interval.low)) ** 2;
    varHigh += (f * (s.confidence_interval.high - s.expected_margin_increment)) ** 2;
  }
  return {
    net_expected_margin_increment: r2(net),
    confidence_interval: { low: r2(net - Math.sqrt(varLow)), high: r2(net + Math.sqrt(varHigh)), level: 0.8 },
    conflicts,
  };
}

const toOverlap = (s: Strategy, type: string): PlanOverlap => ({
  draft_id: s.draft_id,
  product_id: s.promoted_product_id,
  start_date: s.period.start_date,
  end_date: s.period.end_date,
  type,
});

const uniqueOverlaps = (list: PlanOverlap[]) => [...new Map(list.map((o) => [`${o.draft_id}|${o.type}`, o])).values()];

/**
 * Plan strategies that collide with `draft`, in the shape of plan_summary.overlaps (POST /chat): like the backend, every
 * live strategy promoting the same product on overlapping dates, plus the mock portfolio's own conflicts (shared
 * anchor products, same category).
 */
export function overlapsOf(portfolio: Portfolio, strategies: Strategy[], draft: Strategy): PlanOverlap[] {
  const byId = new Map(strategies.map((s) => [s.draft_id, s]));
  const sameProduct = strategies
    .filter(
      (s) =>
        s.draft_id !== draft.draft_id &&
        isLive(s.status) &&
        s.promoted_product_id === draft.promoted_product_id &&
        overlap(windowOf(s), windowOf(draft)),
    )
    .map((s) => toOverlap(s, "overlapping_product"));
  const conflicts = portfolio.conflicts
    .filter((c) => c.strategy_ids.includes(draft.draft_id))
    .flatMap((c) =>
      c.strategy_ids.flatMap((id) => {
        const s = id === draft.draft_id ? undefined : byId.get(id);
        return s ? [toOverlap(s, c.type)] : [];
      }),
    );
  return uniqueOverlaps([...sameProduct, ...conflicts]);
}

/** Every conflict of the plan, shown once per strategy that loses impact (the second one of each pair). */
export function planOverlaps(portfolio: Portfolio, strategies: Strategy[]): PlanOverlap[] {
  const byId = new Map(strategies.map((s) => [s.draft_id, s]));
  return uniqueOverlaps(
    portfolio.conflicts.flatMap((c) => {
      const s = byId.get(c.strategy_ids[1] ?? "");
      return s ? [toOverlap(s, c.type)] : [];
    }),
  );
}
