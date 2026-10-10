import type { ZoneType } from "@/types/branch";
import type { DemandRisk } from "@/types/storeDemandPrediction";

export const ZONE_LABELS: Record<ZoneType, string> = {
  residential: "Residencial",
  business: "Comercial",
  school: "Escolar",
  college: "Universitaria",
  highway: "Carretera",
  industrial: "Industrial",
  shopping_center: "Centro comercial",
  hospital: "Hospital",
};

export const RISK_PRESENTATION: Record<
  DemandRisk,
  { label: string; color: string; softColor: string }
> = {
  healthy: { label: "Stock cubierto", color: "var(--color-primary)", softColor: "var(--color-primary-tint)" },
  watch: { label: "Vigilar stock", color: "var(--color-warning)", softColor: "var(--color-warning-tint)" },
  critical: { label: "Reabastecer ya", color: "var(--color-alert)", softColor: "var(--color-alert-tint)" },
};

/** Demand-driver tags, shown in Spanish. Unknown codes fall back to `snake_case` → "snake case". */
export const TAG_LABELS: Record<string, string> = {
  soft_drink: "Refresco",
  soft_drink_large: "Refresco grande",
  water: "Agua",
  hangover: "Resaca",
  hydration: "Hidratación",
  energy: "Energía",
  juice: "Jugo",
  tea: "Té",
  beer: "Cerveza",
  spirits: "Licores",
  chips: "Botanas",
  party_snack: "Botana de fiesta",
  nuts: "Frutos secos",
  popcorn: "Palomitas",
  chocolate: "Chocolate",
  gift_chocolate: "Chocolate de regalo",
  candy: "Dulces",
  gum: "Chicle",
  milk: "Leche",
  chocolate_milk: "Leche con chocolate",
  bread: "Pan",
  sweet_bread: "Pan dulce",
  cookies: "Galletas",
  rosca: "Rosca",
  soup: "Sopa",
  dip: "Dip",
  tuna: "Atún",
  ice_cream: "Helado",
  ice: "Hielo",
  disposable: "Desechables",
  flowers: "Flores",
  tamales: "Tamales",
  hot_coffee: "Café caliente",
  hot_chocolate: "Chocolate caliente",
  iced_coffee: "Café frío",
};

export function readableTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replaceAll("_", " ");
}
