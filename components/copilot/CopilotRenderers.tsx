"use client";

import { useInterrupt, useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { parseApprovalRequest, parseToolResult } from "@/lib/copilot/parse";

import { ApprovalCard } from "./cards/ApprovalCard";
import { ToolResultView } from "./ToolResultView";
import { ErrorCard } from "./ui/ErrorCard";
import { ToolLoadingCard } from "./ui/Skeleton";

// Backend tool name -> what the user sees while it runs. Keep in sync with copilot-api agent/tools.py.
const TOOLS = {
  get_product_tendency: { label: "Reading sales history and forecasting demand…" },
  get_product_sell_strategy: {
    label: "Designing a strategy…",
    steps: ["Context", "Forecast", "Insights", "Constraints", "Candidates", "Simulation", "Validation", "Draft"],
  },
  get_restock_suggestions: { label: "Checking stock, demand and suppliers…" },
  get_store_overview: { label: "Building the store overview…" },
  get_demand_by_store: { label: "Comparing demand across branches…" },
  generate_store_plan: { label: "Building the weekly commercial plan…" },
  search_products: { label: "Searching the catalog…" },
} as const;

const anyParameters = z.record(z.string(), z.unknown());

function useToolRenderer(name: keyof typeof TOOLS) {
  const config: { label: string; steps?: readonly string[] } = TOOLS[name];
  useRenderTool(
    {
      name,
      parameters: anyParameters,
      render: ({ status, result }) => {
        if (status !== "complete") return <ToolLoadingCard label={config.label} steps={config.steps ? [...config.steps] : undefined} />;
        const parsed = parseToolResult(result);
        return parsed ? <ToolResultView result={parsed} /> : <ErrorCard message="Empty response from the copilot." />;
      },
    },
    [name],
  );
}

/** Registers the generative-UI renderers: each backend tool result becomes a component in the chat. */
export function CopilotRenderers() {
  useToolRenderer("get_product_tendency");
  useToolRenderer("get_product_sell_strategy");
  useToolRenderer("get_restock_suggestions");
  useToolRenderer("get_store_overview");
  useToolRenderer("get_demand_by_store");
  useToolRenderer("generate_store_plan");
  useToolRenderer("search_products");

  useInterrupt({
    enabled: (event) => parseApprovalRequest(event.value) !== null,
    render: ({ event, resolve }) => {
      const request = parseApprovalRequest(event.value);
      if (!request) return <ErrorCard message="Unknown approval request." />;
      return <ApprovalCard request={request} onDecide={(decision) => resolve(decision)} />;
    },
  });

  return null;
}
