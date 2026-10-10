import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleDashed,
  Gauge,
  MapPin,
  Store,
  Users,
} from "lucide-react";
import { Meter } from "@/components/ui/Meter";
import {
  formatDistance,
  formatEventSchedule,
  formatInteger,
  formatMxnCompact,
  formatShare,
  formatSignedPercent,
  formatSignedPoints,
} from "@/lib/format";
import { EVENT_TYPE_LABELS, WEEKDAY_LABELS } from "@/lib/opportunities/labels";
import {
  CONFIDENCE_LABELS,
  confidenceLevel,
  eventEffectPp,
  type ScenarioRow,
} from "@/lib/opportunities/predictionInsights";
import type { DemandEvent } from "@/types/demandEvent";
import type { EventPrediction } from "@/types/eventPrediction";
import { AffectedBranchList } from "./AffectedBranchList";
import { EventFact } from "./EventFact";
import { EventTypeIcon } from "./EventTypeIcon";
import { ImportanceBadge } from "./ImportanceBadge";
import { ProductImpactTable } from "./ProductImpactTable";
import { WeatherSummary } from "./WeatherSummary";

type EventDetailsPanelProps = {
  event: DemandEvent;
  prediction: EventPrediction;
  rows: readonly ScenarioRow[];
  branchNames: ReadonlyMap<string, string>;
  totalBranches: number;
  onCompare: () => void;
};

export function EventDetailsPanel({
  event,
  prediction,
  rows,
  branchNames,
  totalBranches,
  onCompare,
}: EventDetailsPanelProps) {
  const weekday = WEEKDAY_LABELS[prediction.baselineWeekday];
  const { normalDayPct, withEventPct } = prediction.overallScenarios;
  const level = confidenceLevel(prediction.confidence);

  return (
    <article className="flex flex-col gap-5" aria-label={`${event.name} details`}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <EventTypeIcon type={event.type} className="size-4" />
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          <ImportanceBadge importance={event.importance} />
        </div>
        <h2 className="text-lg font-semibold leading-snug text-ink">{event.name}</h2>
        <div className="flex flex-col gap-1 text-sm text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatEventSchedule(event.startsAt, event.isAllDay)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {event.venue.name}
          </span>
        </div>
      </header>

      <section aria-labelledby="projected-change-heading" className="rounded-xl bg-plane p-4">
        <h3 id="projected-change-heading" className="text-xs font-medium text-ink-secondary">
          Event effect
        </h3>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          {formatSignedPoints(eventEffectPp(prediction.overallScenarios))}
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          Projected change caused by the event: normal {weekday} {formatSignedPercent(normalDayPct)}{" "}
          → with the event {formatSignedPercent(withEventPct)}, revenue-weighted across{" "}
          {rows.length} products.
        </p>
        <button
          type="button"
          onClick={onCompare}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Compare with a normal {weekday}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </section>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <EventFact icon={Users} label="Estimated attendance">
          {formatInteger(event.estimatedAttendance)}
        </EventFact>
        <EventFact icon={Banknote} label="Expected extra sales">
          {formatMxnCompact(prediction.expectedExtraSalesMxn)}
        </EventFact>
        <EventFact icon={CircleDashed} label="Influence radius">
          {formatDistance(prediction.influenceRadiusMeters)}
        </EventFact>
        <EventFact icon={Store} label="Affected branches">
          {prediction.affectedBranches.length} of {totalBranches}
        </EventFact>
        <EventFact label="Weather forecast" wide>
          <WeatherSummary weather={event.weather} />
        </EventFact>
        <EventFact icon={Gauge} label="Prediction confidence" wide>
          <span>
            {formatShare(prediction.confidence)} · {CONFIDENCE_LABELS[level]}
          </span>
          <Meter value={prediction.confidence} label="Prediction confidence" />
        </EventFact>
      </dl>

      <section aria-labelledby="products-heading" className="flex flex-col gap-2">
        <h3 id="products-heading" className="text-sm font-semibold text-ink">
          Products with higher demand
        </h3>
        <ProductImpactTable rows={rows} weekdayLabel={weekday} />
      </section>

      <section aria-labelledby="branches-heading" className="flex flex-col gap-2">
        <h3 id="branches-heading" className="text-sm font-semibold text-ink">
          Affected branches
        </h3>
        <AffectedBranchList branches={prediction.affectedBranches} branchNames={branchNames} />
      </section>
    </article>
  );
}
