import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  MapPin,
  PackagePlus,
  Sparkles,
  Store,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { formatInteger, formatShare, formatSignedPercent } from "@/lib/format";
import { readableTag, RISK_PRESENTATION, ZONE_LABELS } from "@/lib/opportunities/storePresentation";
import type { Branch } from "@/types/branch";
import type { Product } from "@/types/product";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";

type StorePredictionPanelProps = {
  branch: Branch;
  product: Product;
  prediction: StoreDemandPrediction;
};

export function StorePredictionPanel({ branch, product, prediction }: StorePredictionPanelProps) {
  const risk = RISK_PRESENTATION[prediction.risk];
  const currentWidth = Math.max(10, (prediction.currentDailyDemand / prediction.predictedDailyDemand) * 100);

  return (
    <article className="flex flex-col gap-5" aria-label={copy.opportunities.storePanel.aria(branch.name)}>
      <header>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted">{copy.opportunities.storePanel.selectedBranch}</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-foreground">{branch.name}</h2>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ color: risk.color, backgroundColor: risk.softColor }}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: risk.color }} aria-hidden />
            {risk.label}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{branch.colonia}</span>
          <span className="inline-flex items-center gap-1"><Store className="size-3.5" aria-hidden />{ZONE_LABELS[branch.zoneType]}</span>
          {branch.is24h ? (
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden />{copy.opportunities.storePanel.open24h}</span>
          ) : null}
        </div>
      </header>

      <section className="rounded-block bg-foreground p-4 text-white" aria-labelledby="forecast-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/65">{copy.opportunities.storePanel.forecastTitle}</p>
            <h3 id="forecast-heading" className="mt-1 text-base font-semibold">{product.name}</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-info-tint">
            <ArrowUpRight className="size-4" aria-hidden />
            {formatSignedPercent(prediction.upliftPct)}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-white/55">{copy.opportunities.storePanel.current}</p>
            <p className="mt-0.5 text-xl font-semibold">{prediction.currentDailyDemand.toFixed(1)}</p>
            <p className="text-[11px] text-white/55">{copy.opportunities.storePanel.unitPerDay}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/55">{copy.opportunities.storePanel.predicted}</p>
            <p className="mt-0.5 text-3xl font-semibold tracking-tight">{prediction.predictedDailyDemand.toFixed(1)}</p>
            <p className="text-[11px] text-white/55">{copy.opportunities.storePanel.unitPerDay}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12" aria-hidden>
          <div className="h-full rounded-full bg-info-tint" style={{ width: `${currentWidth}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-white/55">
          {copy.opportunities.storePanel.confidence(formatShare(prediction.confidence))}
        </p>
      </section>

      <section aria-labelledby="inventory-heading">
        <h3 id="inventory-heading" className="text-sm font-semibold text-foreground">{copy.opportunities.storePanel.inventory.title}</h3>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-block border border-line p-3">
            <dt className="flex items-center gap-1 text-[11px] text-muted"><Boxes className="size-3" aria-hidden />{copy.opportunities.storePanel.inventory.onHand}</dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">{formatInteger(prediction.inventoryUnits)}</dd>
          </div>
          <div className="rounded-block border border-line p-3">
            <dt className="flex items-center gap-1 text-[11px] text-muted"><Clock3 className="size-3" aria-hidden />{copy.opportunities.storePanel.inventory.coverage}</dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">{copy.opportunities.storePanel.inventory.coverageDays(prediction.daysOfCover.toFixed(1))}</dd>
          </div>
          <div className="rounded-block border border-line p-3">
            <dt className="flex items-center gap-1 text-[11px] text-muted"><PackagePlus className="size-3" aria-hidden />{copy.opportunities.storePanel.inventory.add}</dt>
            <dd className="mt-1 text-lg font-semibold" style={{ color: risk.color }}>+{formatInteger(prediction.recommendedExtraUnits)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="drivers-heading">
        <h3 id="drivers-heading" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden /> {copy.opportunities.storePanel.driversTitle}
        </h3>
        <ul className="mt-2 space-y-2">
          {prediction.reasons.map((reason) => (
            <li key={reason} className="flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />{reason}
            </li>
          ))}
        </ul>
        {product.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <span key={tag} className="rounded-control bg-background px-2 py-1 text-[11px] font-medium text-muted">
                {readableTag(tag)}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-block border border-primary/20 bg-primary-tint/45 p-4" aria-labelledby="action-heading">
        <h3 id="action-heading" className="text-sm font-semibold text-foreground">{copy.opportunities.storePanel.action.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {prediction.recommendedExtraUnits > 0
            ? copy.opportunities.storePanel.action.addUnits(formatInteger(prediction.recommendedExtraUnits))
            : copy.opportunities.storePanel.action.keepSchedule}
        </p>
      </section>
    </article>
  );
}
