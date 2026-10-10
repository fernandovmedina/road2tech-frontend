import { useQuery } from "@tanstack/react-query";
import { buildMockDemandEvents } from "@/lib/mock/events";
import { readMockScenario, simulateRequest } from "@/lib/mock/simulateRequest";
import type { DemandEvent } from "@/types/demandEvent";

/** Events in the next two weeks around Saltillo branches, sorted by start time. */
export function getDemandEvents(): Promise<DemandEvent[]> {
  // TODO(backend): GET /api/events?city=saltillo&days=14
  return simulateRequest(() =>
    readMockScenario() === "empty" ? [] : buildMockDemandEvents(new Date()),
  );
}

export function useDemandEvents() {
  return useQuery({ queryKey: ["demand-events", "saltillo"], queryFn: getDemandEvents });
}
