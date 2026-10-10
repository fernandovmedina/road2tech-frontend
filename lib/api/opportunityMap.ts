import type { Branch } from "@/types/branch";
import type { Product } from "@/types/product";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";
import { useBranches, useProducts } from "./catalog";
import { useStoreDemandPredictions, type StoreDemandFilters, type StoreDemandSummary } from "./storeDemand";

export type OpportunityMapSummary = {
  totalDemand: number;
  averageUplift: number;
  atRiskBranches: number;
  extraUnits: number;
};

export type OpportunityMapData = {
  branches: Branch[];
  products: Product[];
  predictions: StoreDemandPrediction[];
  /** Aggregated KPIs for the header, computed once so components only format. */
  summary: OpportunityMapSummary;
};

export type OpportunityMapDataState =
  | { status: "pending" }
  | { status: "error"; isRetrying: boolean; retry: () => void }
  | { status: "success"; data: OpportunityMapData };

/** Everything the store-demand map needs, with one combined loading/error state. */
export function useOpportunityMapData(filters: StoreDemandFilters): OpportunityMapDataState {
  const branches = useBranches();
  const products = useProducts();
  const predictions = useStoreDemandPredictions(filters);

  // Data first: a failed background refetch keeps showing the last good data.
  if (predictions.data && branches.data && products.data) {
    // Live mode: totals come from the backend. The demo generator sends none, so the data layer adds them up here.
    // TODO(backend): send this summary already aggregated in every mode.
    const summary = predictions.data.summary
      ? fromBackend(predictions.data.summary)
      : summarize(predictions.data.predictions);
    return {
      status: "success",
      data: {
        predictions: predictions.data.predictions,
        branches: branches.data,
        products: products.data,
        summary,
      },
    };
  }

  const failed = [predictions, branches, products].filter((query) => query.isError);
  if (failed.length > 0) {
    return {
      status: "error",
      isRetrying: failed.some((query) => query.isFetching),
      retry: () => {
        for (const query of failed) void query.refetch();
      },
    };
  }

  return { status: "pending" };
}

function fromBackend(summary: StoreDemandSummary): OpportunityMapSummary {
  return {
    totalDemand: summary.predictedDailyDemand,
    averageUplift: summary.averageUpliftPct,
    atRiskBranches: summary.storesAtRisk,
    extraUnits: summary.recommendedExtraUnits,
  };
}

function summarize(predictions: readonly StoreDemandPrediction[]): OpportunityMapSummary {
  const totalDemand = predictions.reduce((sum, p) => sum + p.predictedDailyDemand, 0);
  const averageUplift = predictions.length
    ? predictions.reduce((sum, p) => sum + p.upliftPct, 0) / predictions.length
    : 0;
  const atRiskBranches = predictions.filter((p) => p.risk !== "healthy").length;
  const extraUnits = predictions.reduce((sum, p) => sum + p.recommendedExtraUnits, 0);
  return { totalDemand, averageUplift, atRiskBranches, extraUnits };
}
