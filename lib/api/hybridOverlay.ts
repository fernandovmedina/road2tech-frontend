import { apiMode } from "./config";

// "hybrid" mode only. The deployed backend has no strategy plan yet (the M0 endpoints are missing), so it answers
// `ai_opportunity_mxn: 0`, an empty portfolio and a ranking without opportunity. Those plan-derived figures are taken
// from the mock engine (the stand-in for M0, same one that feeds the plan panels) so the dashboard stays coherent
// with the promotions it shows. Everything else (tickets, stock-outs, stores) stays as the backend sent it.
// TODO(backend): remove once GET /stores/{id}/plan and the portfolio optimizer are deployed.

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});

const OVERLAID = [/^\/chain\/summary$/, /^\/stores\/[^/]+\/kpis$/];

export const needsPlanOverlay = (method: string, path: string): boolean =>
  apiMode === "hybrid" && method === "GET" && OVERLAID.some((re) => re.test(path));

/** Returns `live` with the plan-derived fields replaced by the ones of `mock` (both already validated). */
export function overlayPlanFields(path: string, live: unknown, mock: unknown): unknown {
  const l = rec(live);
  const m = rec(mock);
  const kpis = { ...rec(l.kpis), ai_opportunity_mxn: rec(m.kpis).ai_opportunity_mxn };
  if (path !== "/chain/summary") return { ...l, kpis };

  const mockRank = new Map((Array.isArray(m.store_ranking) ? m.store_ranking : []).map((r) => [rec(r).store_id, rec(r)]));
  const ranking = (Array.isArray(l.store_ranking) ? l.store_ranking : [])
    .map((r) => {
      const x = rec(r);
      const p = mockRank.get(x.store_id);
      return p ? { ...x, opportunity_mxn: p.opportunity_mxn, strategies_count: p.strategies_count } : x;
    })
    .sort((a, b) => Number(b.opportunity_mxn ?? 0) - Number(a.opportunity_mxn ?? 0));
  return { ...l, kpis, portfolio_impact: m.portfolio_impact, store_ranking: ranking };
}
