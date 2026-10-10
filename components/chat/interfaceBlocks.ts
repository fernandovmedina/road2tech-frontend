import { BadgePercent, ChartLine, Globe2, Layers, PackageCheck, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/copy";
import type { ChatBlock } from "@/types";

const C = copy.chat;

/** Every block except plain text is an interface: it is drawn in "Interfaces generadas", not inside the conversation. */
export type InterfaceBlock = Exclude<ChatBlock, { type: "text" }>;

export const isInterfaceBlock = (block: ChatBlock): block is InterfaceBlock => block.type !== "text";

export const interfaceIcons: Record<InterfaceBlock["type"], LucideIcon> = {
  forecast_chart: ChartLine,
  strategy_card: BadgePercent,
  plan_summary: Layers,
  restock_table: PackageCheck,
  market_comparison: Globe2,
};

/** Short name of an interface for the chips and the history, e.g. "Tendencia de Coca-Cola 600 ml". */
export function interfaceLabel(block: InterfaceBlock, nameOf: (productId: string) => string): string {
  switch (block.type) {
    case "forecast_chart":
      return C.forecast.title(nameOf(block.product_id));
    case "strategy_card":
      return C.canvas.strategy(block.strategy.title);
    case "plan_summary":
      return C.plan.title;
    case "restock_table":
      return C.canvas.restock(block.suggestions.length);
    case "market_comparison":
      return C.canvas.marketComparison;
  }
}
