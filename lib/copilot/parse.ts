import { approvalRequestSchema, toolResultSchema } from "@/lib/api/copilotSchemas";
import { copy } from "@/lib/copy";
import type { ApprovalRequest, ToolResult } from "@/types/copilot";

const C = copy.copilot;

/**
 * Validates a tool-call result (a JSON string from the agent) against the closed set of known results.
 * Anything else (unknown `kind`, wrong shape, plain text from a failed tool) becomes an error card: never an exception.
 */
export function parseToolResult(raw: unknown): ToolResult | null {
  if (raw === undefined || raw === null || raw === "") return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      // LangGraph returns plain text when a tool raises (e.g. validation errors).
      return { kind: "error", message: raw.slice(0, 300) };
    }
  }
  const parsed = toolResultSchema.safeParse(value);
  return parsed.success ? parsed.data : { kind: "error", message: C.errors.unexpectedResult };
}

/** The approval interrupt arrives as an object or as a JSON string (double-encoded by the agent), depending on the transport. */
export function parseApprovalRequest(value: unknown): ApprovalRequest | null {
  let candidate: unknown = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const parsed = approvalRequestSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
