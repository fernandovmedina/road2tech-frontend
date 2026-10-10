"use client";

import { useState } from "react";

import { formatMoney, formatPct, formatRange, formatSignedMoney, formatSignedUnits, formatUnits } from "@/lib/copilot/format";
import type { DraftStatus, Objective, ProductSellStrategy, StrategyType } from "@/types/copilot";

import { ScenarioChart, type ScenarioMetric } from "../charts/ScenarioChart";
import { CardShell } from "../ui/CardShell";
import { RiskBadge } from "../ui/RiskBadge";
import { StatTile } from "../ui/StatTile";
import { CandidatesTable } from "./CandidatesTable";

const TYPE_LABEL: Record<StrategyType, string> = {
  contextual_discount: "Contextual discount",
  rescue_combo: "Rescue combo",
  affinity_combo: "Cross-sell combo",
};

const OBJECTIVE_LABEL: Record<Objective, string> = {
  increase_sales: "Increase sales",
  reduce_waste: "Reduce waste",
  maximize_margin: "Maximize margin",
};

const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: "Draft · awaiting approval",
  selected: "Added to plan",
  approved: "Approved",
  rejected: "Rejected",
};

type StrategyCardProps = { data: ProductSellStrategy; compact?: boolean };

export function StrategyCard({ data, compact = false }: StrategyCardProps) {
  const [metric, setMetric] = useState<ScenarioMetric>("units");
  const hasStrategy = data.strategy_type !== null;
  const ci = data.confidence_interval;

  return (
    <CardShell
      eyebrow={`Sell strategy · ${OBJECTIVE_LABEL[data.objective]}`}
      title={hasStrategy ? data.recommended_action : `No promotion for ${data.product.product_name}`}
      subtitle={`${data.product.product_name} · ${data.store.store_name} · ${formatRange(data.valid_from, data.valid_to)}`}
      aside={
        hasStrategy ? (
          <>
            <span className="rounded-full bg-sc-accent-soft px-2.5 py-1 text-xs font-medium text-sc-accent">
              {data.strategy_type ? TYPE_LABEL[data.strategy_type] : ""}
            </span>
            <span className="rounded-full border border-sc-line px-2.5 py-1 text-xs text-sc-ink-secondary">
              {data.uplift_source === "campaigns" ? "Uplift measured from past campaigns" : "Uplift assumed"}
            </span>
            <RiskBadge label="Run-out risk" level={data.stockout_risk} />
          </>
        ) : undefined
      }
      footer={data.disclaimer}
    >
      {hasStrategy ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Expected net impact"
              value={formatSignedMoney(data.expected_net_impact)}
              detail={`Range ${formatSignedMoney(ci.low)} to ${formatSignedMoney(ci.high)}`}
              tone={data.expected_net_impact >= 0 ? "good" : "bad"}
            />
            <StatTile
              label="Additional sales"
              value={formatSignedMoney(data.expected_sales_increment)}
              detail={
                data.expected_anchor_units_increment > 0
                  ? `${formatSignedUnits(data.expected_units_increment)} units + ${formatUnits(data.expected_anchor_units_increment)} combo anchor units`
                  : `${formatSignedUnits(data.expected_units_increment)} units`
              }
            />
            <StatTile
              label="Margin increment"
              value={formatSignedMoney(data.expected_margin_increment)}
              detail={`Discount ${formatPct(-data.discount_pct)}`}
              tone={data.expected_margin_increment >= 0 ? "good" : "bad"}
            />
            <StatTile
              label="Waste avoided"
              value={`${formatUnits(data.expected_waste_reduction)} units`}
              detail={formatMoney(data.expected_waste_reduction_value)}
              tone={data.expected_waste_reduction > 0 ? "good" : "neutral"}
            />
          </div>

          {!compact ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Baseline vs. strategy</h4>
                <div role="group" aria-label="Chart metric" className="inline-flex rounded-lg border border-sc-line p-0.5 text-xs">
                  {(["units", "revenue"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={metric === option}
                      onClick={() => setMetric(option)}
                      className={`rounded-md px-2.5 py-1 focus-visible:outline-2 focus-visible:outline-sc-accent ${
                        metric === option ? "bg-sc-accent text-white" : "text-sc-ink-secondary hover:bg-sc-surface-muted"
                      }`}
                    >
                      {option === "units" ? "Units sold" : "Sales (MXN)"}
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
            <p className="rounded-xl bg-sc-surface-muted px-4 py-3 text-sm text-sc-ink-secondary">
              <span className="font-medium text-sc-ink">Combo with {data.cross_sell_product.product_name}.</span>{" "}
              {data.cross_sell_basis}
            </p>
          ) : null}

          {data.draft_id ? (
            <p className="text-sm text-sc-ink-secondary">
              Saved as <span className="font-mono text-sc-ink">{data.draft_id}</span> ·{" "}
              {data.draft_status ? STATUS_LABEL[data.draft_status] : "Draft"}. The agent never activates a promotion by itself.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-sc-ink-secondary">
          Every simulated option broke a business rule (margin, run-out risk or an overlapping promotion), so doing nothing
          is the better choice. The rejected options and reasons are below.
        </p>
      )}

      {!compact ? (
        <>
          <CandidatesTable candidates={data.candidates} />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-sc-accent">
              Assumptions and constraints
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sc-ink-secondary">
              <li>
                Max discount {data.constraints.max_discount_pct}% · min unit margin {data.constraints.min_unit_margin_pct}% ·
                max run-out risk {data.constraints.max_stockout_risk}
                {data.constraints.budget_mxn > 0 ? ` · margin budget ${formatMoney(data.constraints.budget_mxn)}` : ""}
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
