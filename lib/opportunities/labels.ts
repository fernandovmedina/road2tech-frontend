import type { DemandEventType, EventImportance, WeatherCondition } from "@/types/demandEvent";
import type { Weekday } from "@/types/weekday";

/** Reason codes of GET /predictions/* (`reason_codes`), in the wording of the demand map. Unknown codes are shown as is. */
const PREDICTION_REASONS: Record<string, string> = {
  commute_peak: "Commute-hour uplift",
  weather_hot: "Warm afternoon forecast",
  weather_cold: "Cool morning forecast",
  payday: "Payday spending",
  holiday: "Holiday or event demand",
};

export const predictionReasonLabel = (code: string): string => PREDICTION_REASONS[code] ?? code;

export const EVENT_TYPE_ORDER = [
  "football_match",
  "concert",
  "fair",
  "festival",
  "holiday",
] as const satisfies readonly DemandEventType[];

export const EVENT_TYPE_LABELS: Record<DemandEventType, string> = {
  football_match: "Partido de fútbol",
  concert: "Concierto",
  fair: "Feria",
  festival: "Festival",
  holiday: "Día festivo",
};

export const IMPORTANCE_LABELS: Record<EventImportance, string> = {
  regular: "Regular",
  important: "Importante",
  semifinal: "Semifinal",
  final: "Final",
};

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  clear: "Despejado",
  partly_cloudy: "Parcialmente nublado",
  cloudy: "Nublado",
  rain: "Lluvia",
  storm: "Tormentas",
};

export const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly Weekday[];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};
