import { copy } from "@/lib/copy";
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
    <article className="flex flex-col gap-5" aria-label={copy.opportunities.scenarioComparison.aria}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {copy.opportunities.scenarioComparison.eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-foreground">
          {copy.opportunities.scenarioComparison.title(weekday, event.name)}
        </h2>
        <p className="mt-1 text-sm text-muted">{copy.opportunities.scenarioComparison.description}</p>
      </header>

      {lead && (
        <section aria-labelledby="lead-product-heading" className="rounded-block bg-background p-4">
          <h3 id="lead-product-heading" className="text-xs font-medium text-muted">
            {copy.opportunities.scenarioComparison.leadProduct(lead.productName)}
          </h3>
          <dl className="mt-2 grid grid-cols-3 gap-3">
            <ScenarioFigure
              label={copy.opportunities.scenarioComparison.normalLabel(weekday)}
              value={formatSignedPercent(lead.scenarios.normalDayPct)}
              swatchClassName="bg-series-baseline"
            />
            <ScenarioFigure
              label={copy.opportunities.scenarioComparison.eventLabel(weekday)}
              value={formatSignedPercent(lead.scenarios.withEventPct)}
              swatchClassName="bg-series-scenario"
            />
            <ScenarioFigure
              label={copy.opportunities.scenarioComparison.effectLabel}
              value={formatSignedPoints(lead.effectPp)}
            />
          </dl>
        </section>
      )}

      <ScenarioDumbbellChart
        rows={rows}
        normalLabel={copy.opportunities.scenarioComparison.normalLabel(weekday)}
        eventLabel={copy.opportunities.scenarioComparison.eventLabel(weekday)}
      />

      <p className="text-xs text-muted">
        {copy.opportunities.scenarioComparison.footnote(
          rows.length,
          weekday,
          formatSignedPercent(overall.normalDayPct),
          formatSignedPercent(overall.withEventPct),
          formatSignedPoints(eventEffectPp(overall)),
        )}
      </p>
    </article>
  );
}
