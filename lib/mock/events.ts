import type { DemandEvent } from "@/types/demandEvent";
import type { Weekday } from "@/types/weekday";
import { type ClockTime, upcomingSaltilloIso } from "./saltilloCalendar";

type EventFixture = Omit<DemandEvent, "startsAt"> & {
  schedule: { weekday: Weekday; weeksAhead: 0 | 1; time: ClockTime };
};

// Event data only (what, where, when). Demand numbers live in ./predictions.ts.
const EVENT_FIXTURES = [
  {
    id: "ev-liga-mx-final",
    name: "Liga MX Final — Fan zone",
    type: "football_match",
    importance: "final",
    isAllDay: false,
    venue: { name: "Plaza de Armas fan zone", lat: 25.4236, lng: -101.0003 },
    estimatedAttendance: 15000,
    weather: { condition: "clear", temperatureC: 21, precipitationChancePct: 5 },
    schedule: { weekday: "friday", weeksAhead: 0, time: "20:00" },
  },
  {
    id: "ev-saltillo-semifinal",
    name: "Saltillo FC semifinal",
    type: "football_match",
    importance: "semifinal",
    isAllDay: false,
    venue: { name: "Saltillo Olympic Stadium", lat: 25.4418, lng: -100.9842 },
    estimatedAttendance: 9500,
    weather: { condition: "partly_cloudy", temperatureC: 23, precipitationChancePct: 10 },
    schedule: { weekday: "saturday", weeksAhead: 0, time: "19:00" },
  },
  {
    id: "ev-university-match",
    name: "University league match",
    type: "football_match",
    importance: "regular",
    isAllDay: false,
    venue: { name: "UAdeC sports complex", lat: 25.4105, lng: -100.964 },
    estimatedAttendance: 2500,
    weather: { condition: "clear", temperatureC: 19, precipitationChancePct: 0 },
    schedule: { weekday: "wednesday", weeksAhead: 1, time: "18:00" },
  },
  {
    id: "ev-norteno-fest",
    name: "Norteño Fest — Live concert",
    type: "concert",
    importance: "important",
    isAllDay: false,
    venue: { name: "Nazario Ortiz open-air stage", lat: 25.4318, lng: -100.9628 },
    estimatedAttendance: 16000,
    weather: { condition: "clear", temperatureC: 17, precipitationChancePct: 0 },
    schedule: { weekday: "saturday", weeksAhead: 1, time: "21:00" },
  },
  {
    id: "ev-food-craft-fair",
    name: "Food & Craft Fair",
    type: "fair",
    importance: "regular",
    isAllDay: false,
    venue: { name: "South fairgrounds", lat: 25.3925, lng: -101.0175 },
    estimatedAttendance: 8000,
    weather: { condition: "partly_cloudy", temperatureC: 24, precipitationChancePct: 15 },
    schedule: { weekday: "sunday", weeksAhead: 0, time: "11:00" },
  },
  {
    id: "ev-desert-lights",
    name: "Desert Lights Festival",
    type: "festival",
    importance: "important",
    isAllDay: false,
    venue: { name: "Museo del Desierto", lat: 25.4128, lng: -100.9785 },
    estimatedAttendance: 7000,
    weather: { condition: "rain", temperatureC: 16, precipitationChancePct: 55 },
    schedule: { weekday: "saturday", weeksAhead: 0, time: "18:00" },
  },
  {
    id: "ev-carne-asada-cookoff",
    name: "Carne Asada Cook-off",
    type: "festival",
    importance: "regular",
    isAllDay: false,
    venue: { name: "North Carranza park", lat: 25.4585, lng: -100.9915 },
    estimatedAttendance: 4500,
    weather: { condition: "clear", temperatureC: 23, precipitationChancePct: 0 },
    schedule: { weekday: "sunday", weeksAhead: 1, time: "13:00" },
  },
  {
    id: "ev-holiday-monday",
    name: "Holiday Monday — Long weekend",
    type: "holiday",
    importance: "important",
    isAllDay: true,
    venue: { name: "Citywide", lat: 25.444, lng: -101.008 },
    estimatedAttendance: 180000,
    weather: { condition: "clear", temperatureC: 22, precipitationChancePct: 0 },
    schedule: { weekday: "monday", weeksAhead: 1, time: "00:00" },
  },
] as const satisfies readonly EventFixture[];

export type MockEventId = (typeof EVENT_FIXTURES)[number]["id"];

/** Upcoming events, sorted by start time. */
export function buildMockDemandEvents(now: Date): DemandEvent[] {
  return EVENT_FIXTURES.map(({ schedule, venue, weather, ...event }) => ({
    ...event,
    venue: { ...venue },
    weather: { ...weather },
    startsAt: upcomingSaltilloIso(now, schedule.weekday, schedule.weeksAhead, schedule.time),
  })).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
