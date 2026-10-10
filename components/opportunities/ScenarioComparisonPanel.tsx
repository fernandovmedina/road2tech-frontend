import { formatSignedPercent, formatSignedPoints } from "@/lib/format";
import { WEEKDAY_LABELS } from "@/lib/opportunities/labels";
import { eventEffectPp, type ScenarioRow } from "@/lib/opportunities/predictionInsights";
import type { DemandEvent } from "@/types/demandEvent";
import type { EventPrediction } from "@/types/eventPrediction";
import { ScenarioDumbbellChart } from "./ScenarioDumbbellChart";
import { ScenarioFigure } from "./ScenarioFigure";

type ScenarioComparisonPanelProps = {
  event: DemandEvent;
  prediction: EventPrediction;
  rows: readonly ScenarioRow[];
};

export function ScenarioComparisonPanel({ event, prediction, rows }: ScenarioComparisonPanelProps) {
  const weekday = WEEKDAY_LABELS[prediction.baselineWeekday];
  const lead = rows.at(0);
  const overall = prediction.overallScenarios;

  return (
    <article className="flex flex-col gap-5" aria-label="Scenario comparison">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Scenario comparison
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">
          Normal {weekday} vs. {weekday} with {event.name}
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Both scenarios are % change versus an average day. The gap between them is what the
          event adds, in percentage points (pp).
        </p>
      </header>

      {lead && (
        <section aria-labelledby="lead-product-heading" className="rounded-xl bg-plane p-4">
          <h3 id="lead-product-heading" className="text-xs font-medium text-ink-secondary">
            Lead product · {lead.productName}
          </h3>
          <dl className="mt-2 grid grid-cols-3 gap-3">
            <ScenarioFigure
              label={`Normal ${weekday}`}
              value={formatSignedPercent(lead.scenarios.normalDayPct)}
              swatchClassName="bg-normal-day"
            />
            <ScenarioFigure
              label={`${weekday} with the event`}
              value={formatSignedPercent(lead.scenarios.withEventPct)}
              swatchClassName="bg-with-event"
            />
            <ScenarioFigure label="Event effect" value={formatSignedPoints(lead.effectPp)} />
          </dl>
        </section>
      )}

      <ScenarioDumbbellChart
        rows={rows}
        normalLabel={`Normal ${weekday}`}
        eventLabel={`${weekday} with the event`}
      />

      <p className="text-xs text-ink-secondary">
        All {rows.length} affected products, revenue-weighted: {formatSignedPercent(overall.normalDayPct)}{" "}
        on a normal {weekday} → {formatSignedPercent(overall.withEventPct)} with the event (
        {formatSignedPoints(eventEffectPp(overall))}).
      </p>
    </article>
  );
}
