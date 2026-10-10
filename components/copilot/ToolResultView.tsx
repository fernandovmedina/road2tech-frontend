import type { ToolResult } from "@/types/copilot";

import { DemandByStoreCard } from "./cards/DemandByStoreCard";
import { PortfolioCard } from "./cards/PortfolioCard";
import { ProductSearchCard } from "./cards/ProductSearchCard";
import { RestockCard } from "./cards/RestockCard";
import { StoreOverviewCard } from "./cards/StoreOverviewCard";
import { StrategyCard } from "./cards/StrategyCard";
import { TendencyCard } from "./cards/TendencyCard";
import { ErrorCard } from "./ui/ErrorCard";

/** Maps a tool result (by its `kind`) to the component the copilot "sends" into the chat. */
export function ToolResultView({ result }: { result: ToolResult }) {
  switch (result.kind) {
    case "product_tendency":
      return <TendencyCard data={result} />;
    case "product_sell_strategy":
      return <StrategyCard data={result} />;
    case "restock_plan":
      return <RestockCard data={result} />;
    case "store_overview":
      return <StoreOverviewCard data={result} />;
    case "demand_by_store":
      return <DemandByStoreCard data={result} />;
    case "portfolio":
      return <PortfolioCard data={result} />;
    case "product_search":
      return <ProductSearchCard data={result} />;
    case "error":
      return <ErrorCard message={result.message} />;
  }
}
