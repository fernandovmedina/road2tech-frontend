import { copy } from "@/lib/copy";
import type { ChatTool } from "@/types";

const C = copy.chat;

function formatArg(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(formatArg).join(", ")}]`;
  return JSON.stringify(value);
}

/** `get_demand_forecast(store_id=S001, horizon=14)` */
function formatTool(tool: ChatTool): string {
  const args = Object.entries(tool.args)
    .map(([k, v]) => `${k}=${formatArg(v)}`)
    .join(", ");
  return `${tool.name}(${args})`;
}

/** Tools the backend actually ran for this reply, in execution order. */
export function ToolList({ tools }: { tools: ChatTool[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted">{C.toolsTitle}</p>
      <ol className="flex flex-wrap gap-1.5">
        {tools.map((tool, i) => (
          <li
            key={`${tool.name}-${i}`}
            className="max-w-full break-words rounded-md bg-sidebar px-2 py-1 font-mono text-xs text-sidebar-text"
          >
            {formatTool(tool)}
          </li>
        ))}
      </ol>
    </div>
  );
}
