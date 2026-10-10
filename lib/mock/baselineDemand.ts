import type { BaselineDemandProfile } from "@/types/eventPrediction";
import type { Weekday } from "@/types/weekday";
import type { MockProductId } from "./catalog";

/** Normal-day demand without events: % change vs. an average day. */
export const MOCK_BASELINE_CHANGE = {
  "beer-12pk": { monday: -12, tuesday: -14, wednesday: -8, thursday: 0, friday: 15, saturday: 24, sunday: 4 },
  "soda-2l": { monday: -4, tuesday: -5, wednesday: -3, thursday: 0, friday: 4, saturday: 6, sunday: 5 },
  "water-1l": { monday: -2, tuesday: -2, wednesday: -1, thursday: 0, friday: 2, saturday: 3, sunday: 1 },
  "energy-drink": { monday: 6, tuesday: 3, wednesday: 2, thursday: 0, friday: -1, saturday: -5, sunday: -6 },
  "ice-5kg": { monday: -10, tuesday: -12, wednesday: -8, thursday: -2, friday: 10, saturday: 18, sunday: 12 },
  "chips-170g": { monday: -6, tuesday: -6, wednesday: -4, thursday: 0, friday: 8, saturday: 10, sunday: 4 },
  "charcoal-4kg": { monday: -22, tuesday: -25, wednesday: -20, thursday: -10, friday: 12, saturday: 45, sunday: 30 },
  "flank-steak-1kg": { monday: -12, tuesday: -14, wednesday: -10, thursday: -4, friday: 8, saturday: 22, sunday: 14 },
  "tableware-pack": { monday: -8, tuesday: -8, wednesday: -6, thursday: -2, friday: 6, saturday: 12, sunday: 6 },
  "rain-poncho": { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
} satisfies Record<MockProductId, Record<Weekday, number>>;

export function buildMockBaselineDemand(): BaselineDemandProfile[] {
  return Object.entries(MOCK_BASELINE_CHANGE).map(([productId, changeByWeekday]) => ({
    productId,
    changeByWeekday: { ...changeByWeekday },
  }));
}
