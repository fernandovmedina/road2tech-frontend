import { useQuery } from "@tanstack/react-query";
import { MOCK_PRODUCTS } from "@/lib/mock/catalog";
import { displayBranchName } from "@/lib/branding";
import type { Branch, BranchSize, ZoneType } from "@/types/branch";
import type { Product, WeatherSensitivity } from "@/types/product";
import type { Product as ApiProduct, Store } from "@/types";
import { apiMode } from "./config";
import { catalogOptions, storesOptions, useMeta } from "./hooks";

// Branches and products of the demand map, read through the same hooks/cache as the rest of the app (GET /stores and
// GET /products, live or mock depending on lib/api/liveRoutes.ts) and reshaped for the map components.

const MOCK_TAGS = new Map<string, readonly string[]>(MOCK_PRODUCTS.map((p) => [p.id, p.tags]));

function toBranch(s: Store): Branch {
  return {
    id: s.store_id,
    name: displayBranchName(s),
    colonia: s.colonia,
    lat: s.latitude,
    lng: s.longitude,
    zoneType: s.zone_type as ZoneType,
    secondaryZoneType: (s.secondary_zone_type as ZoneType | null) ?? null,
    sizeCategory: s.size_category as BranchSize,
    is24h: s.is_24h === 1,
  };
}

function toProduct(p: ApiProduct, categoryNames: Map<string, string>): Product {
  const sensitivity: WeatherSensitivity = p.weather_sensitivity === "hot" || p.weather_sensitivity === "cold" ? p.weather_sensitivity : "neutral";
  return {
    id: p.product_id,
    name: p.product_name,
    categoryId: p.category_id,
    category: categoryNames.get(p.category_id) ?? p.category_id,
    brand: p.brand,
    unit: p.unit,
    priceMxn: p.retail_price,
    baseDailyDemand: p.base_daily_demand,
    weatherSensitivity: sensitivity,
    // The backend has no demand-driver tags yet (TODO(backend): D20); the demo taxonomy only applies in mock mode.
    tags: p.tags ?? (apiMode === "mock" ? (MOCK_TAGS.get(p.product_id) ?? []) : []),
  };
}

export function useBranches() {
  return useQuery({ ...storesOptions(), select: (stores) => stores.map(toBranch) });
}

export function useProducts() {
  const meta = useMeta();
  const names = new Map((meta.data?.categories ?? []).map((c) => [c.category_id, c.category_name]));
  return useQuery({
    ...catalogOptions(),
    enabled: !!meta.data,
    select: (items) => items.map((p) => toProduct(p, names)),
  });
}
