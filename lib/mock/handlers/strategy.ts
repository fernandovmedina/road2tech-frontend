import type { Plan } from "@/types";
import { MockHttpError } from "../errors";
import type { MockRoute } from "../router";
import { handleAnalysis, handleChat } from "../strategy/chat";
import { loadCtx } from "../strategy/context";
import { applyAction, emptyPlan, getStorePlan as planOf, regeneratePlan } from "../strategy/plan";
import { buildTendency } from "../strategy/tendency";

// Mock "backend" for strategies, plan, tendency and chat (docs/backend-contract.md §2, §3.17, §4).
// The engine (candidates, simulation, optimizer, portfolio) lives in ../strategy/*; this file only wires routes.

/** Plan of a store at the default window (data_as_of + 1 … + 7). Used by the KPI / chain / calendar mocks. */
export async function getStorePlan(storeId: string): Promise<Plan> {
  return planOf(storeId);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const intOr = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : d;
};

export const routes: MockRoute[] = [
  {
    method: "GET",
    path: "/stores/:storeId/plan",
    handler: async ({ params, query, empty }) => {
      const opts = {
        ...(ISO.test(query.from ?? "") ? { from: query.from } : {}),
        ...(ISO.test(query.to ?? "") ? { to: query.to } : {}),
      };
      if (empty) {
        const ctx = await loadCtx();
        if (!ctx.storeById.has(params.storeId)) throw new MockHttpError(404, "store_not_found", `Tienda desconocida: ${params.storeId}`);
        return emptyPlan(ctx, params.storeId, opts);
      }
      return planOf(params.storeId, opts);
    },
  },
  {
    method: "POST",
    path: "/stores/:storeId/strategies:generate",
    handler: async ({ params }) => regeneratePlan(params.storeId),
  },
  { method: "POST", path: "/drafts/:draftId/add-to-plan", handler: ({ params }) => applyAction(params.draftId, "add-to-plan") },
  { method: "POST", path: "/drafts/:draftId/approve", handler: ({ params }) => applyAction(params.draftId, "approve") },
  { method: "POST", path: "/drafts/:draftId/reject", handler: ({ params }) => applyAction(params.draftId, "reject") },
  {
    method: "GET",
    path: "/stores/:storeId/tendency",
    handler: async ({ params, query }) => {
      if (!query.product_id) throw new MockHttpError(422, "product_required", "Falta el parámetro product_id.");
      return buildTendency(params.storeId, query.product_id, intOr(query.history_days, 30), intOr(query.forecast_days, 14));
    },
  },
  { method: "POST", path: "/chat", handler: ({ body }) => handleChat(body) },
  { method: "POST", path: "/assistant/analysis", handler: ({ body }) => handleAnalysis(body) },
];
