import { useQuery } from "@tanstack/react-query";
import { MOCK_BRANCHES, MOCK_PRODUCTS } from "@/lib/mock/catalog";
import {
  buildAggregateStoreDemandPredictions,
  buildBranchProductPredictions,
  buildStoreDemandPredictions,
  type BranchProductDemand,
} from "@/lib/mock/storeDemand";
import { readMockScenario, simulateRequest } from "@/lib/mock/simulateRequest";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";

export const ALL_PRODUCTS_ID = "all";

export type StoreDemandFilters = {
  productId: string;
  category?: string;
  tag?: string;
};

function productsForFilters(filters: StoreDemandFilters) {
  return MOCK_PRODUCTS.filter((product) =>
    (filters.category === undefined || product.category === filters.category)
    && (filters.tag === undefined || product.tags.some((tag) => tag === filters.tag)));
}

export function getStoreDemandPredictions(filters: StoreDemandFilters): Promise<StoreDemandPrediction[]> {
  // TODO(backend): GET /api/predictions/stores?city=saltillo&product_id={productId|all}&category={category}&tag={tag}&days=7
  return simulateRequest(() => {
    if (readMockScenario() === "empty") return [];
    const products = productsForFilters(filters);
    if (filters.productId === ALL_PRODUCTS_ID) {
      return buildAggregateStoreDemandPredictions(MOCK_BRANCHES, products);
    }
    const product = products.find((item) => item.id === filters.productId);
    return product ? buildStoreDemandPredictions(MOCK_BRANCHES, product) : [];
  });
}

export function getBranchProductPredictions(
  branchId: string,
  filters: Omit<StoreDemandFilters, "productId">,
): Promise<BranchProductDemand[]> {
  // TODO(backend): GET /api/predictions/branches/{branchId}/products?category={category}&tag={tag}&days=7
  return simulateRequest(() => {
    if (readMockScenario() === "empty") return [];
    const branch = MOCK_BRANCHES.find((item) => item.id === branchId);
    return branch ? buildBranchProductPredictions(branch, productsForFilters({ ...filters, productId: ALL_PRODUCTS_ID })) : [];
  });
}

export function useStoreDemandPredictions(filters: StoreDemandFilters) {
  return useQuery({
    queryKey: ["store-demand-predictions", "saltillo", filters],
    queryFn: () => getStoreDemandPredictions(filters),
  });
}

export function useBranchProductPredictions(
  branchId: string,
  filters: Omit<StoreDemandFilters, "productId">,
) {
  return useQuery({
    queryKey: ["branch-product-predictions", branchId, filters],
    queryFn: () => getBranchProductPredictions(branchId, filters),
  });
}
