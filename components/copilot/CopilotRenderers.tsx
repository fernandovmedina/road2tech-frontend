"use client";

import { useInterrupt, useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { copy } from "@/lib/copy";
import { parseApprovalRequest, parseToolResult } from "@/lib/copilot/parse";

import { ApprovalCard } from "./cards/ApprovalCard";
import { ToolResultView } from "./ToolResultView";
import { ErrorCard } from "./ui/ErrorCard";
import { ToolLoadingCard } from "./ui/Skeleton";

const C = copy.copilot;

// Tool names of the agent (BackendRoad2Tech services/copilot-api agent/tools.py). Each one gets a named renderer so its
// loading state says what is happening; the wildcard below catches any tool the agent adds later.
type ToolName = Exclude<keyof typeof C.toolLoading, "fallback">;

const anyParameters = z.record(z.string(), z.unknown());

function useToolRenderer(name: ToolName, agentId: string) {
  useRenderTool(
    {
      name,
      agentId,
      parameters: anyParameters,
      render: ({ status, result }) => {
        if (status !== "complete") {
          return (
            <ToolLoadingCard
              label={C.toolLoading[name]}
              steps={name === "get_product_sell_strategy" ? [...C.strategySteps] : undefined}
            />
          );
        }
        const parsed = parseToolResult(result);
        return parsed ? <ToolResultView result={parsed} /> : <ErrorCard message={C.errors.unexpectedResult} />;
      },
    },
    [name, agentId],
  );
}

/** Registers the generative-UI renderers: each backend tool result becomes a component in the chat. */
export function CopilotRenderers({ agentId }: { agentId: string }) {
  useToolRenderer("get_product_tendency", agentId);
  useToolRenderer("get_product_sell_strategy", agentId);
  useToolRenderer("get_restock_suggestions", agentId);
  useToolRenderer("get_store_overview", agentId);
  useToolRenderer("get_demand_by_store", agentId);
  useToolRenderer("generate_store_plan", agentId);
  useToolRenderer("search_products", agentId);

  // Any other tool: never break the chat, show the same validation path (unknown result -> error card).
  useRenderTool(
    {
      name: "*",
      agentId,
      render: ({ status, result }: { status: string; result?: unknown }) => {
        if (status !== "complete") return <ToolLoadingCard label={C.toolLoading.fallback} />;
        const parsed = parseToolResult(result);
        return parsed ? <ToolResultView result={parsed} /> : <ErrorCard message={C.errors.unexpectedResult} />;
      },
    },
    [agentId],
  );

  useInterrupt({
    agentId,
    enabled: (event) => parseApprovalRequest(event.value) !== null,
    render: ({ event, resolve }) => {
      const request = parseApprovalRequest(event.value);
      if (!request) return <ErrorCard message={C.errors.unknownApproval} />;
      return <ApprovalCard request={request} onDecide={(decision) => void resolve(decision)} />;
    },
  });

  return null;
}
