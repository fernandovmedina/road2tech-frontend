import { formatEventSchedule } from "@/lib/format";
import type { DemandEvent, DemandEventType, EventImportance } from "@/types/demandEvent";
import type { EventPrediction } from "@/types/eventPrediction";
import { eventEffectPp } from "./predictionInsights";
import { isSpecialEvent, type OpportunityViewMode } from "./viewModes";

// Map presentation only: turns event data + predictions into what the map draws.

export type ChangeBin = {
  minPp: number;
  label: string;
  fill: string;
  /** Icon color that clears contrast on `fill`. */
  iconColor: string;
};

// Ordinal blue ramp (reference palette steps 250/400/550/700),
// checked with the dataviz validator in --ordinal mode.
export const CHANGE_BINS: readonly ChangeBin[] = [
  {
    minPp: Number.NEGATIVE_INFINITY,
    label: "Menos de +10 pp",
    fill: "var(--color-series-baseline)",
    iconColor: "var(--color-foreground)",
  },
  {
    minPp: 10,
    label: "+10 a +20 pp",
    fill: "color-mix(in srgb, var(--color-series-baseline) 60%, var(--color-series-scenario) 40%)",
    iconColor: "var(--color-foreground)",
  },
  {
    minPp: 20,
    label: "+20 a +30 pp",
    fill: "var(--color-series-scenario)",
    iconColor: "var(--color-card)",
  },
  {
    minPp: 30,
    label: "+30 pp o más",
    fill: "color-mix(in srgb, var(--color-series-scenario) 70%, var(--color-foreground) 30%)",
    iconColor: "var(--color-card)",
  },
];

export function changeBinFor(effectPp: number): ChangeBin {
  return CHANGE_BINS.reduce((match, bin) => (effectPp >= bin.minPp ? bin : match));
}

const MIN_BUBBLE_PX = 28;
const MAX_BUBBLE_PX = 58;

/**
 * Bubble diameter grows with expected extra sales on a square-root scale above a
 * 28px floor, so small events stay legible and clickable. Not strictly
 * area-proportional; the legend draws reference sizes with this same scale.
 */
export function bubbleDiameterPx(valueMxn: number, maxValueMxn: number): number {
  if (maxValueMxn <= 0) return MIN_BUBBLE_PX;
  const ratio = Math.min(1, Math.sqrt(Math.max(0, valueMxn) / maxValueMxn));
  return Math.round(MIN_BUBBLE_PX + (MAX_BUBBLE_PX - MIN_BUBBLE_PX) * ratio);
}

/** Reference sizes for the legend, drawn with the same scale as the map. */
export function bubbleLegendSteps(maxValueMxn: number) {
  return [0.1, 0.4, 1].map((share) => ({
    valueMxn: maxValueMxn * share,
    diameterPx: bubbleDiameterPx(maxValueMxn * share, maxValueMxn),
  }));
}

export type OpportunityPoint = {
  eventId: string;
  name: string;
  type: DemandEventType;
  importance: EventImportance;
  startsAt: string;
  scheduleLabel: string;
  position: { lat: number; lng: number };
  influenceRadiusMeters: number;
  /** Event effect on the revenue-weighted basket, in pp vs. a normal day. */
  effectPp: number;
  bin: ChangeBin;
  diameterPx: number;
  expectedExtraSalesMxn: number;
  isSpecial: boolean;
};

/**
 * Joins events with their predictions, in event order.
 * An event becomes an opportunity point only once it has a prediction.
 */
export function buildOpportunityPoints(
  events: readonly DemandEvent[],
  predictions: readonly EventPrediction[],
): OpportunityPoint[] {
  const predictionByEvent = new Map(predictions.map((prediction) => [prediction.eventId, prediction]));
  const maxExtraSales = Math.max(0, ...predictions.map((prediction) => prediction.expectedExtraSalesMxn));

  return events.flatMap((event) => {
    const prediction = predictionByEvent.get(event.id);
    if (!prediction) return [];
    const effectPp = eventEffectPp(prediction.overallScenarios);
    return [
      {
        eventId: event.id,
        name: event.name,
        type: event.type,
        importance: event.importance,
        startsAt: event.startsAt,
        scheduleLabel: formatEventSchedule(event.startsAt, event.isAllDay),
        position: { lat: event.venue.lat, lng: event.venue.lng },
        influenceRadiusMeters: prediction.influenceRadiusMeters,
        effectPp,
        // Bin the rounded value so the color always matches the "+N pp" label.
        bin: changeBinFor(Math.round(effectPp)),
        diameterPx: bubbleDiameterPx(prediction.expectedExtraSalesMxn, maxExtraSales),
        expectedExtraSalesMxn: prediction.expectedExtraSalesMxn,
        isSpecial: isSpecialEvent(event),
      },
    ];
  });
}

export function pointsForMode(
  points: readonly OpportunityPoint[],
  mode: OpportunityViewMode,
): OpportunityPoint[] {
  switch (mode) {
    case "normal_day":
      return [];
    case "special":
      return points.filter((point) => point.isSpecial);
    case "upcoming":
    case "comparison":
      return [...points];
  }
}

export type ScreenPosition = { x: number; y: number };

export type LabelSide = "below" | "above" | "right" | "left";

const LABEL_SIDES: readonly LabelSide[] = ["below", "above", "right", "left"];
const LABEL_GAP_PX = 8;
const LABEL_HEIGHT_PX = 34;

export type Box = { left: number; top: number; right: number; bottom: number };

export const boxAt = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Rough label width from its text: 11px name line, 10px detail line, 16px padding. */
function estimateLabelWidthPx(point: OpportunityPoint): number {
  return Math.max(point.name.length * 6.4, point.scheduleLabel.length * 5.6) + 16;
}

function labelBox(center: ScreenPosition, radius: number, width: number, side: LabelSide): Box {
  switch (side) {
    case "below":
      return boxAt(center.x - width / 2, center.y + radius + LABEL_GAP_PX, width, LABEL_HEIGHT_PX);
    case "above":
      return boxAt(center.x - width / 2, center.y - radius - LABEL_GAP_PX - LABEL_HEIGHT_PX, width, LABEL_HEIGHT_PX);
    case "right":
      return boxAt(center.x + radius + LABEL_GAP_PX, center.y - LABEL_HEIGHT_PX / 2, width, LABEL_HEIGHT_PX);
    case "left":
      return boxAt(center.x - radius - LABEL_GAP_PX - width, center.y - LABEL_HEIGHT_PX / 2, width, LABEL_HEIGHT_PX);
  }
}

/**
 * Greedy label placement in screen space. The selected point is placed first and always
 * keeps a label; the rest follow by expected extra sales. Each label tries below, above,
 * right and left, and is skipped if every side would leave the map or cover another
 * label or bubble. Skipped labels still show on hover.
 */
export function placeLabels(
  points: readonly OpportunityPoint[],
  positions: ReadonlyMap<string, ScreenPosition>,
  selectedEventId: string | null,
  /** Screen area labels must stay inside (the map minus its overlaid controls). */
  area: Box,
  /** Other marks labels must not cover, such as branch markers. */
  obstacles: readonly Box[] = [],
): Map<string, LabelSide> {
  const bubbles = points.flatMap((point) => {
    const center = positions.get(point.eventId);
    if (!center) return [];
    const radius = point.diameterPx / 2;
    return [{ eventId: point.eventId, box: boxAt(center.x - radius, center.y - radius, radius * 2, radius * 2) }];
  });

  const ordered = [...points].sort((a, b) => {
    if (a.eventId === selectedEventId) return -1;
    if (b.eventId === selectedEventId) return 1;
    return b.expectedExtraSalesMxn - a.expectedExtraSalesMxn;
  });

  const placed: Box[] = [];
  const sides = new Map<string, LabelSide>();
  for (const point of ordered) {
    const center = positions.get(point.eventId);
    if (!center) continue;
    const radius = point.diameterPx / 2;
    const width = estimateLabelWidthPx(point);
    const isFree = (box: Box) =>
      box.left >= area.left &&
      box.top >= area.top &&
      box.right <= area.right &&
      box.bottom <= area.bottom &&
      !placed.some((other) => overlaps(other, box)) &&
      !obstacles.some((obstacle) => overlaps(obstacle, box)) &&
      !bubbles.some((bubble) => bubble.eventId !== point.eventId && overlaps(bubble.box, box));
    const side =
      LABEL_SIDES.find((candidate) => isFree(labelBox(center, radius, width, candidate))) ??
      (point.eventId === selectedEventId ? "below" : undefined);
    if (side) {
      placed.push(labelBox(center, radius, width, side));
      sides.set(point.eventId, side);
    }
  }
  return sides;
}

/** The point with the highest expected extra sales, used as the default selection. */
export function topOpportunity(points: readonly OpportunityPoint[]): OpportunityPoint | null {
  return points.reduce<OpportunityPoint | null>(
    (best, point) => (!best || point.expectedExtraSalesMxn > best.expectedExtraSalesMxn ? point : best),
    null,
  );
}
