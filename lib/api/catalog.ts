import { useQuery } from "@tanstack/react-query";
import { MOCK_BRANCHES, MOCK_PRODUCTS } from "@/lib/mock/catalog";
import { simulateRequest } from "@/lib/mock/simulateRequest";
import type { Branch } from "@/types/branch";
import type { Product } from "@/types/product";

export function getBranches(): Promise<Branch[]> {
  // TODO(backend): GET /api/branches?city=saltillo
  return simulateRequest(() => MOCK_BRANCHES.map((branch) => ({ ...branch })));
}

export function getProducts(): Promise<Product[]> {
  // TODO(backend): GET /api/products
  return simulateRequest(() => MOCK_PRODUCTS.map((product) => ({ ...product })));
}

export function useBranches() {
  return useQuery({ queryKey: ["branches", "saltillo"], queryFn: getBranches });
}

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: getProducts });
}
