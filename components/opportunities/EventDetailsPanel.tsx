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
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { PanelSection } from "@/components/ui/PanelSection";
import { copy } from "@/lib/copy";
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
    <article className="flex flex-col gap-5" aria-label={copy.opportunities.eventDetails.aria(event.name)}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <EventTypeIcon type={event.type} className="size-4" />
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          <ImportanceBadge importance={event.importance} />
        </div>
        <h2 className="text-lg font-semibold leading-snug text-foreground">{event.name}</h2>
        <div className="flex flex-col gap-1 text-sm text-muted">
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

      <PanelSection
        title={copy.opportunities.eventDetails.effectTitle}
        description={copy.opportunities.eventDetails.effectDescription(
          weekday,
          formatSignedPercent(normalDayPct),
          formatSignedPercent(withEventPct),
          rows.length,
        )}
        className="rounded-block bg-background p-4"
      >
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {formatSignedPoints(eventEffectPp(prediction.overallScenarios))}
        </p>
        <Button variant="primary" size="sm" onClick={onCompare}>
          {copy.opportunities.eventDetails.compare(weekday)}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </PanelSection>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <EventFact icon={Users} label={copy.opportunities.eventDetails.facts.attendance}>
          {formatInteger(event.estimatedAttendance)}
        </EventFact>
        <EventFact icon={Banknote} label={copy.opportunities.eventDetails.facts.extraSales}>
          {formatMxnCompact(prediction.expectedExtraSalesMxn)}
        </EventFact>
        <EventFact icon={CircleDashed} label={copy.opportunities.eventDetails.facts.radius}>
          {formatDistance(prediction.influenceRadiusMeters)}
        </EventFact>
        <EventFact icon={Store} label={copy.opportunities.eventDetails.facts.branches}>
          {copy.opportunities.eventDetails.facts.ofTotal(
            prediction.affectedBranches.length,
            totalBranches,
          )}
        </EventFact>
        <EventFact label={copy.opportunities.eventDetails.facts.weather} wide>
          <WeatherSummary weather={event.weather} />
        </EventFact>
        <EventFact icon={Gauge} label={copy.opportunities.eventDetails.facts.confidence} wide>
          <span>
            {formatShare(prediction.confidence)} · {CONFIDENCE_LABELS[level]}
          </span>
          <Meter value={prediction.confidence} label={copy.opportunities.eventDetails.facts.confidence} />
        </EventFact>
      </dl>

      <PanelSection title={copy.opportunities.eventDetails.productsTitle}>
        <ProductImpactTable rows={rows} weekdayLabel={weekday} />
      </PanelSection>

      <PanelSection title={copy.opportunities.eventDetails.branchesTitle}>
        <AffectedBranchList branches={prediction.affectedBranches} branchNames={branchNames} />
      </PanelSection>
    </article>
  );
}
