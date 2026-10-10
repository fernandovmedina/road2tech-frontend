import type { Branch, Product, Supplier } from "@/types";

// Static demo dataset. TODO(backend): replaced by real catalog/stock endpoints.

export const branches: Branch[] = [
  { id: "b-centro", name: "Centro", lat: 25.4232, lng: -101.0053 },
  { id: "b-valle", name: "Valle Real", lat: 25.4529, lng: -100.9714 },
  { id: "b-industrial", name: "Zona Industrial", lat: 25.4705, lng: -100.9988 },
  { id: "b-ramos", name: "Ramos Arizpe", lat: 25.5415, lng: -100.9496 },
  { id: "b-pinos", name: "Los Pinos", lat: 25.3891, lng: -101.0265 },
  { id: "b-norte", name: "Plaza Norte", lat: 25.4608, lng: -101.0211 },
  { id: "b-abedrop", name: "Carlos Abedrop", lat: 25.4146, lng: -100.9647 },
];

export const suppliers: Supplier[] = [
  { id: "s-sierra", name: "Distribuidora Sierra", email: "pedidos@sierra.example.com", leadTimeDays: 2, deliveryDays: "Lun/Jue", minOrderValue: 3000, fillRate: 0.94 },
  { id: "s-lacteos", name: "Lácteos del Valle", email: "ventas@lacteosdelvalle.example.com", leadTimeDays: 1, deliveryDays: "Mar/Vie", minOrderValue: 2500, fillRate: 0.91 },
  { id: "s-pan", name: "Panificadora Norte", email: "pedidos@panificadoranorte.example.com", leadTimeDays: 1, deliveryDays: "Lun/Mié/Vie", minOrderValue: 1200, fillRate: 0.97 },
  { id: "s-granja", name: "Granja San Pedro", email: "contacto@granjasanpedro.example.com", leadTimeDays: 2, deliveryDays: "Mié/Sáb", minOrderValue: 1800, fillRate: 0.88 },
  { id: "s-botanas", name: "Botanas del Norte", email: "ordenes@botanasdelnorte.example.com", leadTimeDays: 3, deliveryDays: "Jue", minOrderValue: 2000, fillRate: 0.9 },
];

// baseDemand = units/day for the whole chain (split among branches by weight)
export type ProductSeed = Product & { baseDemand: number; complementId: string; trendPct: number };

export const productSeeds: ProductSeed[] = [
  { id: "p-yogurt", sku: "LAC-001", name: "Yogurt natural 1 L", category: "Lácteos", supplierId: "s-lacteos", unitCost: 15, price: 28, caseSize: 12, shelfLifeDays: 14, minStock: 60, maxStock: 300, baseDemand: 130, complementId: "p-granola", trendPct: 4 },
  { id: "p-cerveza", sku: "BEB-002", name: "Cerveza lager 6 pack", category: "Bebidas", supplierId: "s-sierra", unitCost: 82, price: 129, caseSize: 4, shelfLifeDays: 180, minStock: 40, maxStock: 200, baseDemand: 95, complementId: "p-papas", trendPct: 18 },
  { id: "p-pan", sku: "PAN-003", name: "Pan blanco grande", category: "Panadería", supplierId: "s-pan", unitCost: 22, price: 39, caseSize: 10, shelfLifeDays: 5, minStock: 50, maxStock: 220, baseDemand: 160, complementId: "p-leche", trendPct: -3 },
  { id: "p-leche", sku: "LAC-004", name: "Leche entera 1 L", category: "Lácteos", supplierId: "s-lacteos", unitCost: 19, price: 29, caseSize: 12, shelfLifeDays: 10, minStock: 80, maxStock: 350, baseDemand: 210, complementId: "p-pan", trendPct: 22 },
  { id: "p-cola", sku: "BEB-005", name: "Refresco cola 2 L", category: "Bebidas", supplierId: "s-sierra", unitCost: 24, price: 38, caseSize: 8, shelfLifeDays: 120, minStock: 70, maxStock: 320, baseDemand: 180, complementId: "p-papas", trendPct: 6 },
  { id: "p-papas", sku: "BOT-006", name: "Papas fritas 170 g", category: "Botanas", supplierId: "s-botanas", unitCost: 21, price: 37, caseSize: 20, shelfLifeDays: 90, minStock: 60, maxStock: 260, baseDemand: 120, complementId: "p-cerveza", trendPct: 11 },
  { id: "p-huevo", sku: "ABA-007", name: "Huevo blanco 18 pzas", category: "Abarrotes", supplierId: "s-granja", unitCost: 48, price: 69, caseSize: 6, shelfLifeDays: 21, minStock: 40, maxStock: 180, baseDemand: 85, complementId: "p-tortilla", trendPct: 2 },
  { id: "p-tortilla", sku: "ABA-008", name: "Tortillas de maíz 1 kg", category: "Abarrotes", supplierId: "s-pan", unitCost: 14, price: 24, caseSize: 10, shelfLifeDays: 4, minStock: 60, maxStock: 240, baseDemand: 190, complementId: "p-huevo", trendPct: -1 },
  { id: "p-granola", sku: "BOT-009", name: "Granola con miel 500 g", category: "Botanas", supplierId: "s-botanas", unitCost: 38, price: 62, caseSize: 12, shelfLifeDays: 150, minStock: 20, maxStock: 120, baseDemand: 28, complementId: "p-yogurt", trendPct: -9 },
  { id: "p-jugo", sku: "BEB-010", name: "Jugo de naranja 1 L", category: "Bebidas", supplierId: "s-lacteos", unitCost: 26, price: 42, caseSize: 12, shelfLifeDays: 12, minStock: 40, maxStock: 200, baseDemand: 70, complementId: "p-pan", trendPct: -12 },
];

export const categories = ["Lácteos", "Bebidas", "Panadería", "Botanas", "Abarrotes"];

// Share of chain demand per branch
export const branchWeight: Record<string, number> = {
  "b-centro": 0.2,
  "b-valle": 0.17,
  "b-industrial": 0.14,
  "b-ramos": 0.1,
  "b-pinos": 0.11,
  "b-norte": 0.16,
  "b-abedrop": 0.12,
};

// Deterministic pseudo-random 0..1 from a string
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Hand-tuned stock fraction of maxStock so every status shows up in the demo
const stockOverrides: Record<string, number> = {
  "p-yogurt|b-centro": 1.4, // overstock → promo story
  "p-leche|b-centro": 0.2,
  "p-leche|b-valle": 0,
  "p-pan|b-norte": 0,
  "p-cerveza|b-industrial": 0.12,
  "p-jugo|b-valle": 1.25,
  "p-cola|b-pinos": 0.1,
  "p-granola|b-centro": 0.95,
  "p-cerveza|b-norte": 1.1, // surplus for the beer + chips weekend combo
};

export function stockQuantity(productId: string, branchId: string, max: number): number {
  const ov = stockOverrides[`${productId}|${branchId}`];
  if (ov !== undefined) return Math.round(max * ov);
  const r = hash01(`${productId}|${branchId}|q`);
  return Math.round(max * (0.3 + r * 0.6));
}
