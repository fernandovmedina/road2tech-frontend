import { distanceMeters } from "@/lib/geo";
import type { DemandEvent } from "@/types/demandEvent";
import type {
  DemandScenarios,
  EventPrediction,
  ProductDemandImpact,
} from "@/types/eventPrediction";
import { MOCK_BASELINE_CHANGE } from "./baselineDemand";
import {
  MOCK_BRANCHES,
  MOCK_PRODUCTS,
  type MockBranchId,
  type MockProductId,
} from "./catalog";
import type { MockEventId } from "./events";
import { saltilloWeekdayOf } from "./saltilloCalendar";

// Simulated demand model. It only reads public event data plus its own inputs.
// TODO(backend): replace with the real prediction endpoint.

const PRODUCT_SALES: Record<
  MockProductId,
  { priceMxn: number; avgDailyUnitsPerBranch: number }
> = {
  "beer-12pk": { priceMxn: 235, avgDailyUnitsPerBranch: 140 },
  "soda-2l": { priceMxn: 38, avgDailyUnitsPerBranch: 260 },
  "water-1l": { priceMxn: 14, avgDailyUnitsPerBranch: 320 },
  "energy-drink": { priceMxn: 32, avgDailyUnitsPerBranch: 90 },
  "ice-5kg": { priceMxn: 45, avgDailyUnitsPerBranch: 80 },
  "chips-170g": { priceMxn: 52, avgDailyUnitsPerBranch: 150 },
  "charcoal-4kg": { priceMxn: 95, avgDailyUnitsPerBranch: 45 },
  "flank-steak-1kg": { priceMxn: 289, avgDailyUnitsPerBranch: 60 },
  "tableware-pack": { priceMxn: 65, avgDailyUnitsPerBranch: 40 },
  "rain-poncho": { priceMxn: 49, avgDailyUnitsPerBranch: 8 },
};

/** Relative store size: 1 = an average branch. */
const BRANCH_VOLUME_INDEX: Record<MockBranchId, number> = {
  "sal-downtown": 1.35,
  "sal-alameda": 0.95,
  "sal-republica": 0.9,
  "sal-carranza-north": 1.25,
  "sal-nazario-ortiz": 1.1,
  "sal-mirasierra": 1,
  "sal-south-ring-road": 0.85,
  "sal-ramos-road": 0.8,
};

type SimulatedEventSignal = {
  influenceRadiusMeters: number;
  confidence: number;
  /** Extra demand caused by the event, in percentage points over a normal day. */
  effectPpByProduct: Partial<Record<MockProductId, number>>;
};

const EVENT_SIGNALS: Record<MockEventId, SimulatedEventSignal> = {
  "ev-liga-mx-final": {
    influenceRadiusMeters: 3600,
    confidence: 0.86,
    effectPpByProduct: {
      "beer-12pk": 50,
      "ice-5kg": 36,
      "chips-170g": 30,
      "charcoal-4kg": 24,
      "soda-2l": 18,
      "flank-steak-1kg": 16,
      "tableware-pack": 12,
    },
  },
  "ev-saltillo-semifinal": {
    influenceRadiusMeters: 2800,
    confidence: 0.81,
    effectPpByProduct: {
      "beer-12pk": 32,
      "chips-170g": 20,
      "ice-5kg": 18,
      "soda-2l": 14,
      "water-1l": 10,
    },
  },
  "ev-university-match": {
    influenceRadiusMeters: 1800,
    confidence: 0.72,
    effectPpByProduct: { "water-1l": 12, "soda-2l": 10, "beer-12pk": 8, "chips-170g": 6 },
  },
  "ev-norteno-fest": {
    influenceRadiusMeters: 4000,
    confidence: 0.79,
    effectPpByProduct: {
      "beer-12pk": 38,
      "water-1l": 34,
      "energy-drink": 28,
      "ice-5kg": 20,
      "soda-2l": 10,
    },
  },
  "ev-food-craft-fair": {
    influenceRadiusMeters: 2400,
    confidence: 0.77,
    effectPpByProduct: {
      "water-1l": 26,
      "soda-2l": 22,
      "tableware-pack": 18,
      "chips-170g": 12,
      "ice-5kg": 10,
    },
  },
  "ev-desert-lights": {
    influenceRadiusMeters: 2800,
    // Rain in the forecast makes attendance, and therefore demand, less certain.
    confidence: 0.64,
    effectPpByProduct: { "rain-poncho": 120, "water-1l": 14, "soda-2l": 10, "chips-170g": 8 },
  },
  "ev-carne-asada-cookoff": {
    influenceRadiusMeters: 2400,
    confidence: 0.74,
    effectPpByProduct: {
      "charcoal-4kg": 40,
      "flank-steak-1kg": 34,
      "beer-12pk": 18,
      "ice-5kg": 14,
      "tableware-pack": 12,
    },
  },
  "ev-holiday-monday": {
    influenceRadiusMeters: 6500,
    confidence: 0.83,
    effectPpByProduct: {
      "charcoal-4kg": 55,
      "flank-steak-1kg": 38,
      "ice-5kg": 28,
      "beer-12pk": 24,
      "tableware-pack": 20,
      "soda-2l": 16,
    },
  },
};

/** Extra stock on top of the expected uplift, to absorb forecast error. */
const SAFETY_BUFFER = 1.1;

function isMockEventId(id: string): id is MockEventId {
  return Object.hasOwn(EVENT_SIGNALS, id);
}

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

function predictEvent(event: DemandEvent, signal: SimulatedEventSignal): EventPrediction {
  const baselineWeekday = saltilloWeekdayOf(event.startsAt);

  const affectedBranches = MOCK_BRANCHES.map((branch) => ({
    branchId: branch.id,
    distanceMeters: Math.round(distanceMeters(event.venue, branch)),
  }))
    .filter((branch) => branch.distanceMeters <= signal.influenceRadiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const affectedVolume = affectedBranches.reduce(
    (total, branch) => total + BRANCH_VOLUME_INDEX[branch.branchId],
    0,
  );

  const weightedImpacts = MOCK_PRODUCTS.flatMap((product) => {
    const effectPp = signal.effectPpByProduct[product.id];
    if (effectPp === undefined) return [];
    const sales = PRODUCT_SALES[product.id];
    const normalDayPct =
      MOCK_BASELINE_CHANGE[product.id as keyof typeof MOCK_BASELINE_CHANGE][baselineWeekday];
    const extraUnits = sales.avgDailyUnitsPerBranch * affectedVolume * (effectPp / 100);
    const impact: ProductDemandImpact = {
      productId: product.id,
      scenarios: { normalDayPct, withEventPct: normalDayPct + effectPp },
      recommendedExtraUnits: Math.ceil(extraUnits * SAFETY_BUFFER),
      expectedExtraSalesMxn: Math.round(extraUnits * sales.priceMxn),
    };
    return [{ impact, weight: sales.avgDailyUnitsPerBranch * sales.priceMxn }];
  });

  const totalWeight = weightedImpacts.reduce((total, item) => total + item.weight, 0);
  const weightedAverage = (pick: (scenarios: DemandScenarios) => number) =>
    totalWeight === 0
      ? 0
      : roundToTenth(
          weightedImpacts.reduce(
            (total, item) => total + pick(item.impact.scenarios) * item.weight,
            0,
          ) / totalWeight,
        );

  const productImpacts = weightedImpacts
    .map((item) => item.impact)
    .sort((a, b) => b.expectedExtraSalesMxn - a.expectedExtraSalesMxn);

  return {
    eventId: event.id,
    baselineWeekday,
    influenceRadiusMeters: signal.influenceRadiusMeters,
    affectedBranches,
    productImpacts,
    overallScenarios: {
      normalDayPct: weightedAverage((scenarios) => scenarios.normalDayPct),
      withEventPct: weightedAverage((scenarios) => scenarios.withEventPct),
    },
    expectedExtraSalesMxn: productImpacts.reduce(
      (total, impact) => total + impact.expectedExtraSalesMxn,
      0,
    ),
    confidence: signal.confidence,
  };
}

export function buildMockEventPredictions(
  events: readonly DemandEvent[],
): EventPrediction[] {
  return events.flatMap((event) =>
    isMockEventId(event.id) ? [predictEvent(event, EVENT_SIGNALS[event.id])] : [],
  );
}
