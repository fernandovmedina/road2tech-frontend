import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type KpiTone = "primary" | "accent" | "alert" | "info" | "warning" | "neutral";

const toneClasses: Record<KpiTone, string> = {
  primary: "bg-primary-tint text-primary",
  accent: "bg-accent-tint text-accent-dark",
  alert: "bg-alert-tint text-alert-dark",
  info: "bg-info-tint text-info",
  warning: "bg-warning-tint text-warning-dark",
  neutral: "bg-line text-muted",
};

/** Standard KPI: 36px icon chip + 24/700 value + optional caption and delta. */
export function Kpi({
  label,
  value,
  icon: Icon,
  caption,
  delta,
  tone = "primary",
  variant = "default",
  valueTone,
  className = "",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  caption?: string;
  /** Already formatted; `positive` only picks the color. */
  delta?: { value: string; positive: boolean };
  tone?: KpiTone;
  variant?: "default" | "highlight";
  /** Optional color class for the value (e.g. `text-alert-dark`). */
  valueTone?: string;
  className?: string;
}) {
  const highlighted = variant === "highlight";
  return (
    <div
      className={cn(
        "rounded-card p-4",
        highlighted ? "bg-sidebar text-white shadow-card" : "border border-line bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-control",
              toneClasses[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", highlighted ? "text-white/70" : "text-muted")}>
            {label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p
              className={cn(
                "truncate text-2xl font-bold tracking-tight",
                valueTone ?? (highlighted ? "text-white" : "text-foreground"),
              )}
            >
              {value}
            </p>
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  highlighted
                    ? "bg-white/10 text-white"
                    : delta.positive
                      ? "bg-primary-tint text-primary"
                      : "bg-alert-tint text-alert-dark",
                )}
              >
                {delta.value}
              </span>
            )}
          </div>
          {caption && (
            <p className={cn("mt-0.5 truncate text-xs", highlighted ? "text-white/60" : "text-muted")}>
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
