"use client";

import { StrategyCard } from "@/components/strategy/StrategyCard";
import { chatDraftsActionable } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import type { ChatBlock } from "@/types";
import { ForecastChartBlock } from "./ForecastChartBlock";
import { MarketComparisonBlock } from "./MarketComparisonBlock";
import { PlanSummaryBlock } from "./PlanSummaryBlock";
import { RestockTable } from "./RestockTable";

/** Renders one block of the known union. Model text is always plain text (never HTML). */
export function ChatBlockView({ block }: { block: ChatBlock }) {
  switch (block.type) {
    case "text":
      return (
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-line bg-white px-4 py-2.5 text-sm leading-relaxed">
          {block.text}
        </p>
      );
    case "forecast_chart":
      return <ForecastChartBlock block={block} />;
    case "strategy_card":
      return (
        <div className="w-full max-w-3xl">
          <StrategyCard strategy={block.strategy} readOnlyNote={chatDraftsActionable ? undefined : copy.chat.draftReadOnly} />
        </div>
      );
    case "plan_summary":
      return <PlanSummaryBlock block={block} />;
    case "restock_table":
      return <RestockTable suggestions={block.suggestions} />;
    case "market_comparison":
      return <MarketComparisonBlock block={block} />;
  }
}
