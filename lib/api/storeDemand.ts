import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { MOCK_BRANCHES, MOCK_PRODUCTS } from "@/lib/mock/catalog";
import {
  buildAggregateStoreDemandPredictions,
  buildBranchProductPredictions,
  buildStoreDemandPredictions,
  type BranchProductDemand,
} from "@/lib/mock/storeDemand";
import { readMockScenario, simulateRequest } from "@/lib/mock/simulateRequest";
import { predictionReasonLabel } from "@/lib/opportunities/labels";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";
import { request } from "./client";
import { useProducts } from "./catalog";
import { useMeta } from "./hooks";
import { isLiveRoute } from "./liveRoutes";
import * as S from "./schemas";

export const ALL_PRODUCTS_ID = "all";

export type StoreDemandFilters = {
  productId: string;
  category?: string;
  tag?: string;
};

/** Chain totals computed by the backend (`summary` of GET /predictions/stores). `averageUpliftPct` is in percent. */
export type StoreDemandSummary = {
  storesCount: number;
  currentDailyDemand: number;
  predictedDailyDemand: number;
  averageUpliftPct: number;
  storesAtRisk: number;
  recommendedExtraUnits: number;
};

export type StoreDemandResult = { predictions: StoreDemandPrediction[]; summary: StoreDemandSummary | null };

const HORIZON_DAYS = 7;
const PRODUCTS_PER_BRANCH = 8;

// The map components show uplift in percent; the API sends fractions (0.164 = +16.4 %).
const toPercent = (fraction: number) => Math.round(fraction * 1000) / 10;

type DemandFields = Omit<z.infer<typeof S.branchProductDemandItemSchema>, "product_id">;

// A store row that sums many products (all products, or a category) is colored by its average stock coverage, not by
// its worst product: with 120 products every store always has a few critical ones and the whole map turned red.
// `coverage_days` is the backend's demand-weighted average (on-hand units / forecast units per day). Thresholds: about
// the typical supplier lead time (3 days) and that plus a safety margin (5 days).
// TODO(backend): the backend should classify aggregate rows itself (and count units on order); remove this then.
const AGGREGATE_CRITICAL_BELOW_DAYS = 3;
const AGGREGATE_WATCH_BELOW_DAYS = 5;

function aggregateRisk(coverageDays: number | null): StoreDemandPrediction["risk"] {
  if (coverageDays === null) return "healthy";
  if (coverageDays < AGGREGATE_CRITICAL_BELOW_DAYS) return "critical";
  return coverageDays < AGGREGATE_WATCH_BELOW_DAYS ? "watch" : "healthy";
}

function toPrediction(branchId: string, productId: string, r: DemandFields, isAggregate = false): StoreDemandPrediction {
  return {
    branchId,
    productId,
    currentDailyDemand: r.current_daily_demand,
    predictedDailyDemand: r.predicted_daily_demand,
    upliftPct: toPercent(r.uplift_pct),
    confidence: r.confidence,
    inventoryUnits: r.closing_qty,
    daysOfCover: r.coverage_days,
    recommendedExtraUnits: r.recommended_extra_qty,
    risk: isAggregate ? aggregateRisk(r.coverage_days) : r.risk,
    reasons: r.reason_codes.map(predictionReasonLabel),
  };
}

function productsForFilters(filters: StoreDemandFilters) {
  return MOCK_PRODUCTS.filter((product) =>
    (filters.category === undefined || product.category === filters.category)
    && (filters.tag === undefined || product.tags.some((tag) => tag === filters.tag)));
}

function getMockStoreDemand(filters: StoreDemandFilters): Promise<StoreDemandResult> {
  return simulateRequest(() => {
    if (readMockScenario() === "empty") return { predictions: [], summary: null };
    const products = productsForFilters(filters);
    if (filters.productId === ALL_PRODUCTS_ID) {
      return { predictions: buildAggregateStoreDemandPredictions(MOCK_BRANCHES, products), summary: null };
    }
    const product = products.find((item) => item.id === filters.productId);
    return { predictions: product ? buildStoreDemandPredictions(MOCK_BRANCHES, product) : [], summary: null };
  });
}

function getMockBranchProducts(branchId: string, filters: Omit<StoreDemandFilters, "productId">): Promise<BranchProductDemand[]> {
  return simulateRequest(() => {
    if (readMockScenario() === "empty") return [];
    const branch = MOCK_BRANCHES.find((item) => item.id === branchId);
    return branch ? buildBranchProductPredictions(branch, productsForFilters({ ...filters, productId: ALL_PRODUCTS_ID })) : [];
  });
}

const isLive = () => isLiveRoute("GET", "/predictions/stores");

/** Forecast of every store for one product, or for all/filtered products (GET /predictions/stores). */
export function useStoreDemandPredictions(filters: StoreDemandFilters) {
  const live = isLive();
  const meta = useMeta();
  // The map filters by category name; the API wants the id.
  const categoryId = meta.data?.categories.find((c) => c.category_name === filters.category)?.category_id;
  return useQuery({
    queryKey: live ? ["store-demand", filters.productId, categoryId ?? null] : ["store-demand-predictions", "saltillo", filters],
    enabled: !live || (!!meta.data && (filters.category === undefined || !!categoryId)),
    queryFn: async (): Promise<StoreDemandResult> => {
      if (!live) return getMockStoreDemand(filters);
      // TODO(backend): D20, `tag` is ignored by the backend until products carry tags, so it is not sent.
      const { data } = await request("/predictions/stores", S.storeDemandSchema, {
        query: {
          product_id: filters.productId === ALL_PRODUCTS_ID ? undefined : filters.productId,
          category_id: categoryId,
          horizon_days: HORIZON_DAYS,
        },
      });
      const predictions = data.items.map((r) => toPrediction(r.store_id, r.product_id ?? ALL_PRODUCTS_ID, r, r.products_count > 1));
      const isAggregate = data.items.some((r) => r.products_count > 1);
      return {
        predictions,
        summary: {
          storesCount: data.summary.stores_count,
          currentDailyDemand: data.summary.current_daily_demand,
          predictedDailyDemand: data.summary.predicted_daily_demand,
          averageUpliftPct: toPercent(data.summary.average_uplift_pct),
          // Counted from the rows as they are colored, so the KPI matches the map.
          storesAtRisk: isAggregate ? predictions.filter((p) => p.risk !== "healthy").length : data.summary.stores_at_risk,
          recommendedExtraUnits: data.summary.recommended_extra_qty,
        },
      };
    },
  });
}

type BranchProductsRaw = { mock: BranchProductDemand[] } | { rows: z.infer<typeof S.branchProductDemandItemSchema>[] };

/** Priority products of one store with their forecast (GET /stores/{id}/predictions/products). */
export function useBranchProductPredictions(branchId: string, filters: Omit<StoreDemandFilters, "productId">) {
  const live = isLive();
  const meta = useMeta();
  const products = useProducts();
  const categoryId = meta.data?.categories.find((c) => c.category_name === filters.category)?.category_id;
  return useQuery({
    queryKey: live ? ["branch-product-demand", branchId, categoryId ?? null] : ["branch-product-predictions", branchId, filters],
    enabled: !live || (!!meta.data && !!products.data && (filters.category === undefined || !!categoryId)),
    queryFn: async (): Promise<BranchProductsRaw> => {
      if (!live) return { mock: await getMockBranchProducts(branchId, filters) };
      const { data } = await request(`/stores/${branchId}/predictions/products`, S.branchProductDemandSchema, {
        query: { category_id: categoryId, horizon_days: HORIZON_DAYS, sort: "priority", page: 1, page_size: PRODUCTS_PER_BRANCH },
      });
      return { rows: data.items };
    },
    // Rows are joined with the catalog here so a catalog refresh does not refetch the forecast.
    select: (res): BranchProductDemand[] => {
      if ("mock" in res) return res.mock;
      const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
      return res.rows.flatMap((r) => {
        const product = byId.get(r.product_id);
        return product ? [{ product, prediction: toPrediction(branchId, r.product_id, r) }] : [];
      });
    },
  });
}
