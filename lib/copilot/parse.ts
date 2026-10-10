import type { ApprovalRequest, ToolResult } from "@/types/copilot";

const KINDS = new Set<ToolResult["kind"]>([
  "product_tendency",
  "product_sell_strategy",
  "restock_plan",
  "store_overview",
  "demand_by_store",
  "portfolio",
  "product_search",
  "error",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Parse a tool-call result (a JSON string from the Copilot API) into a typed result. */
export function parseToolResult(raw: string | undefined): ToolResult | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (isRecord(value) && typeof value.kind === "string" && KINDS.has(value.kind as ToolResult["kind"])) {
      return value as ToolResult;
    }
    return { kind: "error", message: typeof value === "string" ? value : "Unexpected response from the copilot." };
  } catch {
    // LangGraph returns plain text when a tool raises (e.g. validation errors).
    return { kind: "error", message: raw.slice(0, 300) };
  }
}

/** The approval interrupt arrives as an object or as a JSON string, depending on the transport. */
export function parseApprovalRequest(value: unknown): ApprovalRequest | null {
  let candidate: unknown = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (isRecord(candidate) && candidate.type === "promotion_approval" && typeof candidate.draft_id === "string") {
    return candidate as ApprovalRequest;
  }
  return null;
}
