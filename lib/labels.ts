// Spanish labels for codes and English values that come from the dataset/backend.
// Unknown codes fall back to the original text so a new backend value never breaks the UI.

const categories: Record<string, string> = {
  C01: "Bebidas sin alcohol",
  C02: "Bebidas alcohólicas",
  C03: "Botanas y papas",
  C04: "Dulces y chocolates",
  C05: "Comida preparada",
  C06: "Café y bebidas calientes",
  C07: "Lácteos y refrigerados",
  C08: "Panadería y galletas",
  C09: "Abarrotes",
  C10: "Congelados y helados",
  C11: "Hielo",
  C12: "Cigarros",
  C13: "Higiene personal",
  C14: "Limpieza",
  C15: "Farmacia (OTC)",
  C16: "Mascotas",
  C17: "Bebés",
  C18: "Frutas y verduras",
  C19: "Desechables y fiesta",
  C20: "Flores y regalos",
};

const zones: Record<string, string> = {
  residential: "Residencial",
  business: "Negocios",
  school: "Escolar",
  college: "Universitaria",
  highway: "Carretera",
  industrial: "Industrial",
  shopping_center: "Centro comercial",
  hospital: "Hospital",
};

const sizes: Record<string, string> = { small: "Pequeña", medium: "Mediana", large: "Grande" };

const weekdays: Record<string, string> = {
  Mon: "Lun", Tue: "Mar", Wed: "Mié", Thu: "Jue", Fri: "Vie", Sat: "Sáb", Sun: "Dom",
  Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles", Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo",
};

const weather: Record<string, string> = { rainy: "Lluvioso", hot: "Caluroso", cold: "Frío", mild: "Templado" };

const seasons: Record<string, string> = { winter: "Invierno", spring: "Primavera", summer: "Verano", autumn: "Otoño" };

const events: Record<string, string> = {
  "New Year's Day": "Año Nuevo",
  "Three Kings' Eve": "Víspera de Reyes",
  "Three Kings' Day": "Día de Reyes",
  Candlemas: "Día de la Candelaria",
  "Constitution Day": "Día de la Constitución",
  "Super Bowl": "Super Bowl",
  "Valentine's Eve": "Víspera de San Valentín",
  "Valentine's Day": "San Valentín",
  Lent: "Cuaresma",
  "Holy Week": "Semana Santa",
  "Benito Juarez's Birthday": "Natalicio de Benito Juárez",
  "Children's Day": "Día del Niño",
  "Labor Day": "Día del Trabajo",
  "Mother's Day Eve": "Víspera del Día de las Madres",
  "Mother's Day": "Día de las Madres",
  "Federal Election Day": "Elecciones federales",
  "Father's Day": "Día del Padre",
  "Liga MX Playoffs Match Day": "Partido de liguilla Liga MX",
  "FIFA World Cup 2026": "Mundial FIFA 2026",
  "Mexico Match Day": "Partido de México",
  "Saltillo City Anniversary": "Aniversario de Saltillo",
  "Saltillo Fair": "Feria de Saltillo",
  "Santo Cristo de la Capilla Festivities": "Fiestas del Santo Cristo de la Capilla",
  "Back to School": "Regreso a clases",
  "Independence Day": "Día de la Independencia",
  "Presidential Inauguration Day": "Toma de protesta presidencial",
  Halloween: "Halloween",
  "Day of the Dead": "Día de Muertos",
  "Buen Fin": "El Buen Fin",
  "Revolution Day": "Día de la Revolución",
  "Our Lady of Guadalupe Day": "Día de la Virgen de Guadalupe",
  "Guadalupe-Reyes Season": "Temporada Guadalupe-Reyes",
  "Christmas Eve": "Nochebuena",
  "Christmas Day": "Navidad",
  "New Year's Eve": "Fin de año",
};

const eventScopes: Record<string, string> = {
  national: "Nacional", local: "Local", sports: "Deportivo", commercial: "Comercial", religious: "Religioso", school: "Escolar",
};

const forecastDrivers: Record<string, string> = {
  weekend: "Fin de semana",
  payday: "Quincena",
  event: "Evento",
  hot_weather: "Calor",
  cold_weather: "Frío",
  recent_trend_up: "Tendencia reciente al alza",
  recent_trend_down: "Tendencia reciente a la baja",
  promotion: "Promoción en el plan",
};

const restockReasons: Record<string, string> = {
  below_min: "Bajo mínimo",
  demand_spike: "Pico de demanda",
  stockout: "Sin stock",
  season: "Temporada",
  expiring: "Por caducar",
  expiry: "Por caducar",
  urgent: "Urgente",
};

const strategyTypes: Record<string, string> = {
  affinity_combo: "Combo de afinidad",
  rescue_bundle: "Combo de rescate",
  contextual_offer: "Promoción contextual",
};

const strategyObjectives: Record<string, string> = {
  increase_ticket: "Aumentar ticket",
  reduce_waste: "Reducir merma",
  increase_volume: "Aumentar volumen",
};

const strategyStatuses: Record<string, string> = {
  draft: "Borrador",
  selected: "En el plan",
  approved: "Aprobada",
  scheduled: "Programada",
  active: "Activa",
  measured: "Medida",
  expired: "Expirada",
  rejected: "Rechazada",
};

const stockStatuses: Record<string, string> = { out: "Sin stock", low: "Bajo mínimo", ok: "En rango", over: "Sobrestock" };

const overlapTypes: Record<string, string> = {
  overlapping_product: "Mismo producto",
  category_cannibalization: "Misma categoría",
};

export const labels = {
  category: categories,
  zone: zones,
  size: sizes,
  weekday: weekdays,
  weather,
  season: seasons,
  event: events,
  eventScope: eventScopes,
  restockReason: restockReasons,
  forecastDriver: forecastDrivers,
  strategyType: strategyTypes,
  strategyObjective: strategyObjectives,
  strategyStatus: strategyStatuses,
  stockStatus: stockStatuses,
  overlapType: overlapTypes,
} as const;

export type LabelKind = keyof typeof labels;

/** Translate one code; returns the original text when no translation exists. */
export function t(kind: LabelKind, code: string | null | undefined): string {
  if (!code) return "";
  const dict: Record<string, string> = labels[kind];
  return dict[code] ?? code;
}

/** Translate a `|`-separated list ("Tue|Fri" → "Mar/Vie"). */
export function tList(kind: LabelKind, codes: string | null | undefined, separator = "/"): string {
  if (!codes) return "";
  return codes.split("|").map((c) => t(kind, c.trim())).join(separator);
}
