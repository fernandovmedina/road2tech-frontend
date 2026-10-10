export type DemandEventType =
  | "football_match"
  | "concert"
  | "fair"
  | "festival"
  | "holiday";

export type EventImportance = "regular" | "important" | "semifinal" | "final";

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "rain"
  | "storm";

export type WeatherForecast = {
  condition: WeatherCondition;
  temperatureC: number;
  precipitationChancePct: number;
};

export type EventVenue = {
  name: string;
  lat: number;
  lng: number;
};

/**
 * Raw event data: what happens, where and when.
 * It carries no demand numbers — those live in `EventPrediction`.
 */
export type DemandEvent = {
  id: string;
  name: string;
  type: DemandEventType;
  importance: EventImportance;
  /** ISO 8601 with the Saltillo UTC offset, e.g. "2026-10-16T20:00:00-06:00". */
  startsAt: string;
  isAllDay: boolean;
  venue: EventVenue;
  estimatedAttendance: number;
  weather: WeatherForecast;
};
