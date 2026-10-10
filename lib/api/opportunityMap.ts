import type { Branch } from "@/types/branch";
import type { Product } from "@/types/product";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";
import { useBranches, useProducts } from "./catalog";
import { useStoreDemandPredictions, type StoreDemandFilters, type StoreDemandSummary } from "./storeDemand";

export type OpportunityMapData = {
  branches: Branch[];
  products: Product[];
  predictions: StoreDemandPrediction[];
  /** Chain totals computed by the backend; `null` while the demo generator answers (mock mode). */
  summary: StoreDemandSummary | null;
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
    return {
      status: "success",
      data: {
        predictions: predictions.data.predictions,
        summary: predictions.data.summary,
        branches: branches.data,
        products: products.data,
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
