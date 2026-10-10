"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as engine from "@/lib/mock/engine";
import { branches, categories as seedCategories, productSeeds } from "@/lib/mock/seed";
import { getState, mutate, type SupplierPatch } from "@/lib/mock/store";
import { addDays, todayIso } from "@/lib/format";
import { mockCall } from "./client";
import type { Branch, ChatMessage, DataMode, Product, RangeKey, RestockOrder, Supplier } from "@/types";

// All screen data goes through these hooks. TODO(backend): swap each queryFn for a real request.

const qk = (...k: unknown[]) => ["api", ...k];

export type Scope = { branchId: string | "all"; mode: DataMode; range: RangeKey };

/* ---------- reads ---------- */

export const useBranches = () =>
  useQuery({ queryKey: qk("branches"), queryFn: () => mockCall<Branch[]>(() => branches) });

export const useCategories = () => ({ data: seedCategories });

export const useProducts = () =>
  useQuery({ queryKey: qk("products"), queryFn: () => mockCall(() => engine.getProducts(), { emptyValue: [] }) });

export const useProduct = (id: string) =>
  useQuery({ queryKey: qk("product", id), queryFn: () => mockCall(() => engine.getProduct(id) ?? null) });

export const useSuppliers = () =>
  useQuery({ queryKey: qk("suppliers"), queryFn: () => mockCall(() => engine.getSuppliers(), { emptyValue: [] }) });

export const useSupplierNextDelivery = (supplier: Supplier | undefined) => supplier ? engine.nextDeliveryDate(supplier) : null;

export const useKpis = (s: Scope) =>
  useQuery({
    queryKey: qk("kpis", s),
    queryFn: () => mockCall(() => engine.getKpis(s.branchId, s.mode, s.range), {
      emptyValue: { averageTicket: 0, averageTicketDeltaPct: 0, stockouts: 0, noDemand: 0, aiOpportunity: 0 },
    }),
  });

export const useBehaviors = (s: Scope) =>
  useQuery({ queryKey: qk("behaviors", s), queryFn: () => mockCall(() => engine.getBehaviors(s.branchId), { emptyValue: [] }) });

export const useHeat = (productId: string | null) =>
  useQuery({ queryKey: qk("heat", productId), queryFn: () => mockCall(() => engine.getHeat(productId), { emptyValue: [] }) });

export const useProductRows = (s: Scope) =>
  useQuery({ queryKey: qk("rows", s), queryFn: () => mockCall(() => engine.getProductRows(s.branchId, s.mode, s.range), { emptyValue: [] }) });

export const usePromos = () =>
  useQuery({ queryKey: qk("promos"), queryFn: () => mockCall(() => engine.getPromos(), { emptyValue: [] }) });

export const usePromo = (id: string | undefined) =>
  useQuery({ queryKey: qk("promo", id), queryFn: () => mockCall(() => engine.getPromos().find((p) => p.id === id) ?? null), enabled: !!id });

export const usePromoForProduct = (productId: string, branchId: string | "all") =>
  useQuery({
    queryKey: qk("promoForProduct", productId, branchId),
    queryFn: () => mockCall(() => engine.getPromos().find((p) => p.productId === productId && (branchId === "all" || p.branchId === branchId))
      ?? engine.getPromos().find((p) => p.productId === productId) ?? null),
  });

export const useTrend = (productId: string, branchId: string | "all", discount?: number) =>
  useQuery({
    queryKey: qk("trend", productId, branchId, discount),
    queryFn: () => mockCall(() => engine.getTrend(productId, branchId, discount)),
    placeholderData: (prev) => prev,
  });

export const useStock = (branchId: string | "all") =>
  useQuery({ queryKey: qk("stock", branchId), queryFn: () => mockCall(() => engine.getStock(branchId), { emptyValue: [] }) });

export const useRestockSuggestions = (branchId: string | "all") =>
  useQuery({ queryKey: qk("restock", branchId), queryFn: () => mockCall(() => engine.getRestockSuggestions(branchId), { emptyValue: [] }) });

export const useCalendarEvents = (branchId: string | "all") =>
  useQuery({ queryKey: qk("calendar", branchId), queryFn: () => mockCall(() => engine.getCalendarEvents(branchId), { emptyValue: [] }) });

export const useOrders = () =>
  useQuery({ queryKey: qk("orders"), queryFn: () => mockCall(() => getState().orders) });

/* ---------- pure helpers backed by the mock model (synchronous: drive the slider live) ---------- */

export const simulateForPromo = (promoId: string, discountPct: number) => {
  const input = engine.getPromoInput(promoId);
  if (!input) return null;
  return { without: engine.simulatePromo(input, 0), with: engine.simulatePromo(input, discountPct), input };
};

/* ---------- mutations ---------- */

function useInvalidating<TArgs, TRes>(fn: (a: TArgs) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["api"] }) });
}

export const useAcceptPromo = () =>
  useInvalidating(({ id, discountPct }: { id: string; discountPct: number }) =>
    mockCall(() => { mutate((s) => { s.promoStatus[id] = { status: "accepted", discountPct }; }); return true; }));

export const useDismissPromo = () =>
  useInvalidating((id: string) =>
    mockCall(() => { mutate((s) => { s.promoStatus[id] = { status: "dismissed" }; }); return true; }));

export const useSendOrder = () =>
  useInvalidating(({ suggestionId, qty, estimatedCost }: { suggestionId: string; qty: number; estimatedCost: number }) =>
    // TODO(backend): POST /orders → Resend
    mockCall<RestockOrder>(() => {
      const order: RestockOrder = { id: `ord-${Date.now()}`, suggestionId, qty, estimatedCost, status: "sent", sentAt: new Date().toISOString() };
      mutate((s) => { s.orders.push(order); });
      return order;
    }));

export const useSaveSupplier = () =>
  useInvalidating(({ id, patch }: { id: string; patch: SupplierPatch }) =>
    mockCall(() => {
      mutate((s) => {
        const extra = s.extraSuppliers.find((x) => x.id === id);
        if (extra) Object.assign(extra, patch);
        else s.supplierPatches[id] = { ...s.supplierPatches[id], ...patch };
      });
      return true;
    }));

export const useAddSupplier = () =>
  useInvalidating((sup: Omit<Supplier, "id">) =>
    mockCall<Supplier>(() => {
      const created: Supplier = { ...sup, id: `s-new-${Date.now()}` };
      mutate((s) => { s.extraSuppliers.push(created); });
      return created;
    }));

export const useSendTestEmail = () =>
  // TODO(backend): POST /suppliers/:id/test-email → Resend
  useMutation({ mutationFn: (email: string) => mockCall(() => ({ to: email, sentAt: new Date().toISOString() })) });

export const useSaveMinMax = () =>
  useInvalidating((rows: Record<string, { minStock: number; maxStock: number }>) =>
    mockCall(() => { mutate((s) => { Object.assign(s.minMax, rows); }); return true; }));

export type MinMaxSuggestion = { productId: string; minStock: number; maxStock: number; reason: string };
export const useSuggestMinMax = () =>
  // TODO(backend): POST /agent/min-max-suggestions
  useMutation({
    mutationFn: () => mockCall<MinMaxSuggestion[]>(() =>
      productSeeds.map((p) => {
        const perBranch = (p.baseDemand * 0.14) | 0;
        const leadFactor = p.shelfLifeDays <= 7 ? 2.5 : 4;
        const minStock = Math.max(10, Math.round(perBranch * leadFactor / p.caseSize) * p.caseSize);
        const cap = p.shelfLifeDays <= 7 ? 6 : p.shelfLifeDays <= 21 ? 9 : 14;
        const maxStock = Math.max(minStock + p.caseSize * 2, Math.round(perBranch * cap / p.caseSize) * p.caseSize);
        const reason = p.shelfLifeDays <= 7
          ? `Caduca en ${p.shelfLifeDays} días: baja el máximo para evitar merma.`
          : p.trendPct >= 10
            ? `Demanda en alza (+${p.trendPct}%): sube el mínimo para evitar quiebres.`
            : `Ajustado a ${perBranch} u/día por sucursal y entrega del proveedor.`;
        return { productId: p.id, minStock, maxStock, reason };
      })),
  });

export type ChatReply = Pick<ChatMessage, "tool" | "blocks">;
export async function askAssistant(prompt: string, branchId: string | "all"): Promise<ChatReply> {
  // TODO(backend): POST /agent/chat (tool-calling agent) streaming ChatBlocks
  return mockCall<ChatReply>(() => {
    const p = prompt.toLowerCase();
    const bid = branchId === "all" ? "b-centro" : branchId;
    if (p.includes("tendencia") || p.includes("yogurt") || p.includes("demanda")) {
      return {
        tool: 'plot_trend(product="Yogurt natural 1 L", horizon=14)',
        blocks: [
          { type: "text", text: "El yogurt muestra un excedente en Centro: la demanda proyectada baja y el stock supera lo que se venderá antes de caducar." },
          { type: "trend_chart", productId: "p-yogurt", branchId: bid, points: engine.getTrend("p-yogurt", bid) },
        ],
      };
    }
    if (p.includes("pedir") || p.includes("restock") || p.includes("orden")) {
      return {
        tool: 'draft_restock_order(branch="' + (bid) + '", limit=4)',
        blocks: [
          { type: "text", text: "Estos son los pedidos con mayor riesgo de quiebre. Revísalos y confirma; no enviaré nada sin tu aprobación." },
          { type: "restock_table", suggestions: engine.getRestockSuggestions(branchId).slice(0, 4) },
        ],
      };
    }
    if (p.includes("promo")) {
      const top = engine.getPromos().sort((a, b) => engine.promoGain(b) - engine.promoGain(a))[0];
      return {
        tool: "suggest_promotions(top=1)",
        blocks: [
          { type: "text", text: `Mi mejor promoción hoy: "${top.title}" con ${top.optimalDiscountPct}% de descuento, ganancia estimada +$${Math.round(engine.promoGain(top)).toLocaleString("es-MX")}. Ábrela en el simulador para comparar escenarios.` },
          { type: "trend_chart", productId: top.productId, branchId: top.branchId, points: engine.getTrend(top.productId, top.branchId) },
        ],
      };
    }
    return {
      blocks: [{ type: "text", text: "Aún no tengo una respuesta para eso. Prueba con: «Tendencia del yogurt», «¿Qué debo pedir hoy?» o «Mejor promoción»." }],
    };
  });
}

export const todayPlus = (n: number) => addDays(todayIso(), n);
export type { Product };
