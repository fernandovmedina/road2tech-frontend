"use client";

import { useEffect } from "react";
import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { copy } from "@/lib/copy";
import { addDays } from "@/lib/format";
import { coversSuggestion, useSentOrders } from "@/lib/sentOrders";
import { useFilters } from "@/lib/filters";
import { request } from "./client";
import { apiMode } from "./config";
import * as S from "./schemas";
import type { ChatBlock, ChatMessage, DataMode, Product, RangeKey, Store } from "@/types";

// Every screen reads and writes data through these hooks (and only these). Names follow docs/backend-contract.md.
// "Hoy" is always `data_as_of` from the backend (useAsOf), never the browser clock.

const qk = (...k: unknown[]) => ["api", ...k];

export type Scope = { branchId: string | "all"; mode: DataMode; range: RangeKey };
export type PageParams = { page?: number; pageSize?: number };

/* ---------- date helpers driven by data_as_of ---------- */

export function rangeToDates(asOf: string, range: RangeKey): { from: string; to: string } {
  switch (range) {
    case "last7": return { from: addDays(asOf, -6), to: asOf };
    case "last30": return { from: addDays(asOf, -29), to: asOf };
    case "next14": return { from: addDays(asOf, 1), to: addDays(asOf, 14) };
    case "next30": return { from: addDays(asOf, 1), to: addDays(asOf, 30) };
  }
}

/**
 * KPIs and the chain summary describe closed days: the backend rejects `to > data_as_of` (400). For the "next N days"
 * ranges of the forecast mode they get the equivalent-length window that ends at data_as_of instead.
 * TODO(backend): define what `mode=forecast` means for these two endpoints.
 */
function closedWindow(asOf: string, range: RangeKey): { from: string; to: string } {
  switch (range) {
    case "next14": return { from: addDays(asOf, -13), to: asOf };
    case "next30": return { from: addDays(asOf, -29), to: asOf };
    default: return rangeToDates(asOf, range);
  }
}

/* ---------- meta / catalogs ---------- */

const metaOptions = () =>
  queryOptions({ queryKey: qk("meta"), queryFn: async () => (await request("/meta", S.metaSchema)).data, staleTime: Infinity });

export const useMeta = () => useQuery(metaOptions());

/** The "today" of the whole UI. `undefined` until /meta answers; dependent queries wait for it. */
export const useAsOf = (): string | undefined => useMeta().data?.data_as_of;

const storesOptions = () =>
  queryOptions({
    queryKey: qk("stores"),
    queryFn: async () => (await request("/stores", S.itemsOf(S.storeSchema))).data.items,
    staleTime: Infinity,
  });

export const useStores = () => useQuery(storesOptions());

export function useStore(storeId: string | "all"): Store | undefined {
  const stores = useStores().data;
  return storeId === "all" ? undefined : stores?.find((s) => s.store_id === storeId);
}

export const useProducts = (p: PageParams & { categoryId?: string; q?: string } = {}) =>
  useQuery({
    queryKey: qk("products", p),
    queryFn: async () =>
      (await request("/products", S.pageOf(S.productSchema), {
        query: { page: p.page ?? 1, page_size: p.pageSize ?? 25, category_id: p.categoryId, q: p.q },
      })).data,
    placeholderData: keepPreviousData,
  });

/** Whole catalog (120 products) for name lookups and autocomplete; pages of 100 are merged. */
const catalogOptions = () =>
  queryOptions({
    queryKey: qk("catalog"),
    queryFn: async () => {
      const get = (page: number) => request("/products", S.pageOf(S.productSchema), { query: { page, page_size: 100 } }).then((r) => r.data);
      // Pages 1 and 2 go out together (the catalog has 120 products); more pages, if any, follow one by one.
      const [a, b] = await Promise.all([get(1), get(2)]);
      const all: Product[] = [...a.items, ...b.items];
      for (let page = 3; (page - 1) * 100 < a.total; page++) all.push(...(await get(page)).items);
      return all;
    },
    staleTime: Infinity,
  });

export function useCatalog() {
  const q = useQuery(catalogOptions());
  const byId = new Map((q.data ?? []).map((p) => [p.product_id, p]));
  return { ...q, byId, nameOf: (id: string) => byId.get(id)?.product_name ?? id };
}

export const useSuppliers = () =>
  useQuery({
    queryKey: qk("suppliers"),
    queryFn: async () => (await request("/suppliers", S.itemsOf(S.supplierSchema))).data.items,
    staleTime: Infinity,
  });

export const useSupplierOffers = (supplierId: string | undefined, p: PageParams & { categoryId?: string; q?: string } = {}) =>
  useQuery({
    queryKey: qk("offers", supplierId, p),
    enabled: !!supplierId,
    queryFn: async () =>
      (await request(`/suppliers/${supplierId}/offers`, S.pageOf(S.supplierOfferSchema), {
        query: { page: p.page ?? 1, page_size: p.pageSize ?? 25, category_id: p.categoryId, q: p.q },
      })).data,
    placeholderData: keepPreviousData,
  });

/* ---------- dashboard ---------- */

const chainSummaryOptions = (asOf: string | undefined, scope: Pick<Scope, "mode" | "range">, zone?: string) =>
  queryOptions({
    queryKey: qk("chain", scope, zone, asOf),
    enabled: !!asOf,
    queryFn: async () => {
      const { from, to } = closedWindow(asOf!, scope.range);
      return (await request("/chain/summary", S.chainSummarySchema, { query: { from, to, mode: scope.mode, zone } })).data;
    },
  });

export function useChainSummary(scope: Pick<Scope, "mode" | "range">, zone?: string) {
  const asOf = useAsOf();
  return useQuery({ ...chainSummaryOptions(asOf, scope, zone), placeholderData: keepPreviousData });
}

/**
 * Starts the dashboard's first requests as soon as the session exists, so they overlap (and wake the backend's
 * functions) instead of waiting for the page to ask for them one after another. Same cache keys as the hooks above.
 * Not needed in mock mode.
 */
export function usePrefetchDashboard(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || apiMode === "mock") return;
    void qc.prefetchQuery(storesOptions());
    void qc.prefetchQuery(catalogOptions());
    void qc.fetchQuery(metaOptions()).then(
      (meta) => {
        const { mode, range } = useFilters.getState();
        void qc.prefetchQuery(chainSummaryOptions(meta.data_as_of, { mode, range }));
      },
      () => undefined,
    );
  }, [enabled, qc]);
}

export function useStoreKpis(storeId: string | "all", scope: Pick<Scope, "mode" | "range">) {
  const asOf = useAsOf();
  return useQuery({
    queryKey: qk("kpis", storeId, scope, asOf),
    enabled: !!asOf && storeId !== "all",
    queryFn: async () => {
      const { from, to } = closedWindow(asOf!, scope.range);
      return (await request(`/stores/${storeId}/kpis`, S.storeKpisSchema, { query: { from, to, mode: scope.mode } })).data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useHeat(scope: Pick<Scope, "mode" | "range">, opts: { productId?: string | null; zone?: string } = {}) {
  const asOf = useAsOf();
  return useQuery({
    queryKey: qk("heat", scope, opts, asOf),
    enabled: !!asOf,
    queryFn: async () => {
      const { from, to } = rangeToDates(asOf!, scope.range);
      return (await request("/heat", S.heatSchema, {
        query: { from, to, mode: scope.mode, product_id: opts.productId ?? undefined, zone: opts.zone },
      })).data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useBehaviors(storeId: string | "all", scope: Pick<Scope, "mode" | "range">, limit = 6) {
  const asOf = useAsOf();
  return useQuery({
    queryKey: qk("behaviors", storeId, scope, limit, asOf),
    enabled: !!asOf && storeId !== "all",
    queryFn: async () => {
      const { from, to } = rangeToDates(asOf!, scope.range);
      return (await request(`/stores/${storeId}/behaviors`, S.itemsOf(S.behaviorSchema), { query: { from, to, limit } })).data.items;
    },
  });
}

/* ---------- trend ---------- */

export const useTendency = (storeId: string | undefined, productId: string | undefined, historyDays = 30, forecastDays = 14) =>
  useQuery({
    queryKey: qk("tendency", storeId, productId, historyDays, forecastDays),
    enabled: !!storeId && storeId !== "all" && !!productId,
    queryFn: async () =>
      (await request(`/stores/${storeId}/tendency`, S.tendencySchema, {
        query: { product_id: productId, history_days: historyDays, forecast_days: forecastDays },
      })).data,
  });

/* ---------- stock ---------- */

export type StockParams = PageParams & {
  storeId: string | "all";
  status?: "out" | "low" | "ok" | "over";
  categoryId?: string;
  q?: string;
  sort?: "coverage_days" | "quantity" | "product_name";
};

export const useStock = (p: StockParams) =>
  useQuery({
    queryKey: qk("stock", p),
    queryFn: async () =>
      (await request(`/stores/${p.storeId}/stock`, S.pageOf(S.stockItemSchema), {
        query: { page: p.page ?? 1, page_size: p.pageSize ?? 25, status: p.status, category_id: p.categoryId, q: p.q, sort: p.sort },
      })).data,
    placeholderData: keepPreviousData,
  });

export const useStockSummary = (p: { storeId: string | "all"; categoryId?: string; q?: string }) =>
  useQuery({
    queryKey: qk("stock-summary", p),
    queryFn: async () =>
      (await request("/stock/summary", S.stockSummarySchema, {
        query: { store_id: p.storeId === "all" ? undefined : p.storeId, category_id: p.categoryId, q: p.q },
      })).data,
    placeholderData: keepPreviousData,
  });

export const useStockPolicy = (storeId: string | undefined, p: PageParams & { categoryId?: string; q?: string } = {}) =>
  useQuery({
    queryKey: qk("policy", storeId, p),
    enabled: !!storeId && storeId !== "all",
    queryFn: async () =>
      (await request(`/stores/${storeId}/stock-policy`, S.policyPageSchema, {
        query: { page: p.page ?? 1, page_size: p.pageSize ?? 25, category_id: p.categoryId, q: p.q },
      })).data,
    placeholderData: keepPreviousData,
  });

/* ---------- restock & calendar ---------- */

/**
 * Suggestions already ordered from this browser (lib/sentOrders.ts) come back with `order_status: "sent"`, so the
 * screens stop offering them. Orders go out by e-mail and the backend does not register them yet.
 */
export const useRestockSuggestions = (storeId: string | undefined, p: PageParams & { urgentOnly?: boolean; productId?: string } = {}) => {
  const asOf = useAsOf();
  const { orders } = useSentOrders();
  return useQuery({
    select: (page) => ({
      ...page,
      items: page.items.map((s) => (orders.some((o) => coversSuggestion(o, s)) ? { ...s, order_status: "sent" as const } : s)),
    }),
    queryKey: qk("restock", storeId, p, asOf),
    enabled: !!storeId && storeId !== "all" && !!asOf,
    queryFn: async () =>
      (await request(`/stores/${storeId}/restock-suggestions`, S.pageOf(S.restockSuggestionSchema), {
        query: {
          from: asOf,
          to: addDays(asOf!, 14),
          urgent_only: p.urgentOnly,
          product_id: p.productId,
          page: p.page ?? 1,
          page_size: p.pageSize ?? 25,
        },
      })).data,
    placeholderData: keepPreviousData,
  });
};

/** Deliveries of orders sent from this browser (lib/sentOrders.ts) are drawn as "en camino" until the backend knows them. */
export const useCalendar = (storeId: string | undefined, from: string, to: string, layers?: string) => {
  const { orders } = useSentOrders();
  return useQuery({
    select: (cal) => ({
      ...cal,
      events: [
        ...cal.events,
        ...orders
          .filter((o) => o.storeId === storeId && o.expectedDelivery >= from && o.expectedDelivery <= to)
          .map((o) => ({
            id: `sent_${o.suggestionId}`,
            date: o.expectedDelivery,
            kind: "delivery" as const,
            label_code: "delivery",
            product_id: o.productId,
            supplier_id: o.supplierId,
            order_id: copy.calendar.sentOrderLabel,
            qty: o.qty,
          })),
      ],
    }),
    queryKey: qk("calendar", storeId, from, to, layers),
    enabled: !!storeId && storeId !== "all",
    queryFn: async () => (await request(`/stores/${storeId}/calendar`, S.calendarSchema, { query: { from, to, layers } })).data,
    placeholderData: keepPreviousData,
  });
};

/* ---------- plan & strategies ---------- */

export function useStorePlan(storeId: string | undefined) {
  const asOf = useAsOf();
  return useQuery({
    queryKey: qk("plan", storeId, asOf),
    enabled: !!storeId && storeId !== "all" && !!asOf,
    queryFn: async () =>
      (await request(`/stores/${storeId}/plan`, S.planSchema, { query: { from: addDays(asOf!, 1), to: addDays(asOf!, 7) } })).data,
  });
}

function useInvalidating<TArgs, TRes>(fn: (a: TArgs) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["api"] }) });
}

type ActionArg = string | { draftId: string; discountPct?: number };
const action = (arg: ActionArg, verb: "add-to-plan" | "approve" | "reject") => {
  const { draftId, discountPct } = typeof arg === "string" ? { draftId: arg, discountPct: undefined } : arg;
  return request(`/drafts/${draftId}/${verb}`, S.strategyActionSchema, {
    method: "POST",
    body: discountPct === undefined ? {} : { discount_pct: discountPct },
  }).then((r) => r.data);
};

/** One strategy with its discount curve (powers the detail screen and the slider). */
export const useStrategy = (draftId: string | undefined) =>
  useQuery({
    queryKey: qk("strategy", draftId),
    enabled: !!draftId,
    queryFn: async () => (await request(`/drafts/${draftId}`, S.strategyDetailSchema)).data,
  });

/** draft → selected. The backend returns the recalculated portfolio. */
export const useAddToPlan = () => useInvalidating((arg: ActionArg) => action(arg, "add-to-plan"));
/** selected → approved, optionally at the discount chosen on the slider. Call only after an explicit confirmation dialog. */
export const useApproveStrategy = () => useInvalidating((arg: ActionArg) => action(arg, "approve"));
export const useRejectStrategy = () => useInvalidating((arg: ActionArg) => action(arg, "reject"));
export const useRegeneratePlan = () =>
  useInvalidating((storeId: string) => request(`/stores/${storeId}/strategies:generate`, S.planSchema, { method: "POST", body: {} }).then((r) => r.data));

/* ---------- mutations: stock policy, orders, e-mails ---------- */

export const useSavePolicy = () =>
  useInvalidating(({ storeId, items }: { storeId: string; items: { product_id: string; reorder_point: number; max_stock: number }[] }) =>
    request(`/stores/${storeId}/stock-policy`, S.policySaveSchema, { method: "PUT", body: { items } }).then((r) => r.data));

export const useSuggestPolicy = () =>
  useMutation({
    mutationFn: ({ storeId, productIds }: { storeId: string; productIds: string[] }) =>
      request(`/stores/${storeId}/stock-policy:suggest`, S.policySuggestionSchema, { method: "POST", body: { product_ids: productIds } }).then((r) => r.data),
  });

export type OutgoingEmail = { to: string; subject: string; text: string; htmlBody: string; fromName: string };

/**
 * Sends one e-mail through Resend (POST /emails). Only call after an explicit confirmation.
 * The recipient is chosen in the UI (lib/mailSettings.ts); the backend does not redirect it.
 * TODO(backend): POST /restock-orders would also record the purchase order, but it mails the supplier's own address.
 */
export const useSendEmail = () =>
  useMutation({
    mutationFn: (m: OutgoingEmail) =>
      request("/emails", S.sentEmailSchema, {
        method: "POST",
        body: { to: m.to, subject: m.subject, text: m.text, htmlBody: m.htmlBody, from_name: m.fromName },
      }).then((r) => r.data),
  });

/* ---------- chat ---------- */

export type ChatResult = { conversationId: string; messageId: string; dropped: number } & Pick<ChatMessage, "tools" | "constraints" | "blocks">;

/** Parses blocks one by one: an unknown or invalid block is dropped (and counted), the rest is shown. */
export function parseChatBlocks(raw: unknown[]): { blocks: ChatBlock[]; dropped: number } {
  const blocks: ChatBlock[] = [];
  let dropped = 0;
  for (const b of raw) {
    const r = S.chatBlockSchema.safeParse(b);
    if (r.success) blocks.push(r.data);
    else dropped++;
  }
  return { blocks, dropped };
}

export const useSendChat = () => {
  const qc = useQueryClient();
  // A chat reply may create a draft; only the plan-related data can change.
  return useMutation({ mutationFn: sendChat, onSuccess: () => qc.invalidateQueries({ queryKey: ["api", "plan"] }) });
};

const sendChat = (async ({ storeId, conversationId, message }: { storeId: string; conversationId: string | null; message: string }): Promise<ChatResult> => {
    const res = (await request("/chat", S.chatResponseSchema, {
      method: "POST",
      body: { store_id: storeId, conversation_id: conversationId, message },
    })).data;
    const { blocks, dropped } = parseChatBlocks(res.blocks);
    return { conversationId: res.conversation_id, messageId: res.message_id, tools: res.tools, constraints: res.interpreted_constraints, blocks, dropped };
  });
