import type { Tone } from "@/components/ui/Badge";
import type { StockStatus } from "@/types";

// Presentation only: the status itself always comes from the backend.
export const STOCK_STATUSES: StockStatus[] = ["out", "low", "ok", "over"];

export const statusTone: Record<StockStatus, Tone> = { out: "red", low: "amber", ok: "green", over: "blue" };
export const statusBar: Record<StockStatus, string> = { out: "bg-alert", low: "bg-[#E8A100]", ok: "bg-primary", over: "bg-info" };
export const statusText: Record<StockStatus, string> = { out: "text-alert", low: "text-[#B07800]", ok: "text-primary", over: "text-info" };
