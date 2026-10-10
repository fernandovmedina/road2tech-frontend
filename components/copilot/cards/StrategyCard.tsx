"use client";

import { useState } from "react";

import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatMoney, formatPct, formatRange, formatSignedMoney, formatSignedUnits, formatUnits } from "@/lib/copilot/format";
import { t } from "@/lib/labels";
import type { ProductSellStrategy } from "@/types/copilot";

import { ScenarioChart, type ScenarioMetric } from "../charts/ScenarioChart";
import { CardShell } from "../ui/CardShell";
import { RiskBadge } from "../ui/RiskBadge";
import { StatTile } from "../ui/StatTile";
import { CandidatesTable } from "./CandidatesTable";

const C = copy.copilot;
const S = C.strategy;

type StrategyCardProps = { data: ProductSellStrategy; compact?: boolean };

export function StrategyCard({ data, compact = false }: StrategyCardProps) {
  const [metric, setMetric] = useState<ScenarioMetric>("units");
  const hasStrategy = data.strategy_type !== null;
  const ci = data.confidence_interval;

  return (
    <CardShell
      eyebrow={S.eyebrow(t("agentObjective", data.objective))}
      title={hasStrategy ? data.recommended_action : S.noPromotion(data.product.product_name)}
      subtitle={`${data.product.product_name} · ${displayBranchName(data.store)} · ${formatRange(data.valid_from, data.valid_to)}`}
      aside={
        hasStrategy ? (
          <>
            <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary">
              {data.strategy_type ? t("agentStrategyType", data.strategy_type) : ""}
            </span>
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
              {data.uplift_source === "campaigns" ? S.upliftMeasured : S.upliftAssumed}
            </span>
            <RiskBadge label={C.risk.runOut} level={data.stockout_risk} />
          </>
        ) : undefined
      }
      footer={data.disclaimer}
    >
      {hasStrategy ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label={S.netImpact}
              value={formatSignedMoney(data.expected_net_impact)}
              detail={S.range(formatSignedMoney(ci.low), formatSignedMoney(ci.high))}
              tone={data.expected_net_impact >= 0 ? "good" : "bad"}
            />
            <StatTile
              label={S.extraSales}
              value={formatSignedMoney(data.expected_sales_increment)}
              detail={
                data.expected_anchor_units_increment > 0
                  ? S.unitsPlusAnchor(formatSignedUnits(data.expected_units_increment), formatUnits(data.expected_anchor_units_increment))
                  : S.unitsOnly(formatSignedUnits(data.expected_units_increment))
              }
            />
            <StatTile
              label={S.marginIncrement}
              value={formatSignedMoney(data.expected_margin_increment)}
              detail={S.discount(formatPct(-data.discount_pct))}
              tone={data.expected_margin_increment >= 0 ? "good" : "bad"}
            />
            <StatTile
              label={S.wasteAvoided}
              value={S.wasteUnits(formatUnits(data.expected_waste_reduction))}
              detail={formatMoney(data.expected_waste_reduction_value)}
              tone={data.expected_waste_reduction > 0 ? "good" : "neutral"}
            />
          </div>

          {!compact ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">{S.baselineVsStrategy}</h4>
                <div role="group" aria-label={S.metricGroup} className="inline-flex rounded-control border border-line p-0.5 text-xs">
                  {(["units", "revenue"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={metric === option}
                      onClick={() => setMetric(option)}
                      className={`min-h-8 rounded-md px-2.5 py-1 focus-visible:outline-2 focus-visible:outline-primary ${
                        metric === option ? "bg-primary text-white" : "text-muted hover:bg-background"
                      }`}
                    >
                      {option === "units" ? S.metricUnits : S.metricRevenue}
                    </button>
                  ))}
                </div>
              </div>
              <ScenarioChart
                baseline={data.baseline_series}
                strategy={data.strategy_series}
                metric={metric}
                validFrom={data.valid_from}
                validTo={data.valid_to}
              />
            </div>
          ) : null}

          {data.cross_sell_product && data.cross_sell_basis ? (
            <p className="rounded-block bg-background px-4 py-3 text-sm text-muted">
              <span className="font-medium text-foreground">{S.comboWith(data.cross_sell_product.product_name)}</span> {data.cross_sell_basis}
            </p>
          ) : null}

          {data.draft_id ? (
            <p className="text-sm text-muted">
              {S.savedAs} <span className="font-mono text-foreground">{data.draft_id}</span> ·{" "}
              {t("agentDraftStatus", data.draft_status ?? "draft")}. {S.draftSuffix}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">{S.noneExplain}</p>
      )}

      {!compact ? (
        <>
          <CandidatesTable candidates={data.candidates} />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">{S.assumptions}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>
                {S.constraints(
                  data.constraints.max_discount_pct,
                  data.constraints.min_unit_margin_pct,
                  t("agentRiskLevel", data.constraints.max_stockout_risk).toLowerCase(),
                  data.constraints.budget_mxn > 0 ? formatMoney(data.constraints.budget_mxn) : null,
                )}
              </li>
              {data.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </CardShell>
  );
}
