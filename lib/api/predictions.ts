import { useQuery } from "@tanstack/react-query";
import { buildMockBaselineDemand } from "@/lib/mock/baselineDemand";
import { buildMockDemandEvents } from "@/lib/mock/events";
import { buildMockEventPredictions } from "@/lib/mock/predictions";
import { readMockScenario, simulateRequest } from "@/lib/mock/simulateRequest";
import type { BaselineDemandProfile, EventPrediction } from "@/types/eventPrediction";

/** Demand predictions for the upcoming events returned by `getDemandEvents`. */
export function getEventPredictions(): Promise<EventPrediction[]> {
  // TODO(backend): GET /api/predictions/events?city=saltillo&days=14
  return simulateRequest(() =>
    readMockScenario() === "empty"
      ? []
      : buildMockEventPredictions(buildMockDemandEvents(new Date())),
  );
}

/** Normal-day demand per weekday, used as the no-event baseline scenario. */
export function getBaselineDemand(): Promise<BaselineDemandProfile[]> {
  // TODO(backend): GET /api/predictions/baseline?city=saltillo
  return simulateRequest(buildMockBaselineDemand);
}

export function useEventPredictions() {
  return useQuery({
    queryKey: ["event-predictions", "saltillo"],
    queryFn: getEventPredictions,
  });
}

export function useBaselineDemand() {
  return useQuery({ queryKey: ["baseline-demand", "saltillo"], queryFn: getBaselineDemand });
}
