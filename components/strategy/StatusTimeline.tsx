import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import type { StrategyStatus } from "@/types";

const S = copy.strategy.timeline;

const FLOW: StrategyStatus[] = ["draft", "selected", "approved", "scheduled", "active", "measured"];

type StepState = "done" | "current" | "pending";
type Step = { status: StrategyStatus; state: StepState };

function buildSteps(status: StrategyStatus): Step[] {
  if (status === "rejected") return [...FLOW.map((s) => ({ status: s, state: "pending" as const })), { status, state: "current" }];
  if (status === "expired") return [...FLOW.map((s) => ({ status: s, state: "done" as const })), { status, state: "current" }];
  const at = FLOW.indexOf(status);
  return FLOW.map((s, i) => ({ status: s, state: i < at ? "done" : i === at ? "current" : "pending" }));
}

const bar: Record<StepState, string> = {
  done: "bg-primary/40",
  current: "bg-primary",
  pending: "bg-line",
};
const terminalBar: Partial<Record<StrategyStatus, string>> = {
  rejected: "bg-alert",
  expired: "bg-muted",
};

/**
 * Compact lifecycle line: one thin segment per step (Borrador → En el plan → Aprobada → Programada → Activa → Medida,
 * plus the terminal states). Only the current step is named on small screens; all names show from `sm` up.
 */
export function StatusTimeline({ status }: { status: StrategyStatus }) {
  const steps = buildSteps(status);
  return (
    <ol aria-label={S.label} className="flex items-start gap-1">
      {steps.map((step) => {
        const terminal = step.status === "rejected" || step.status === "expired";
        const color = step.state === "current" && terminal ? (terminalBar[step.status] ?? bar.current) : bar[step.state];
        const current = step.state === "current";
        return (
          <li key={step.status} aria-current={current ? "step" : undefined} className={`min-w-0 flex-1 ${current ? "" : "hidden sm:block"}`}>
            <span aria-hidden className={`block h-1.5 rounded-full ${color}`} />
            <span className={`mt-1 block truncate text-xs leading-tight ${current ? "font-bold text-foreground" : "font-medium text-muted"}`}>
              {step.state === "done" && <span aria-hidden>✓ </span>}
              {t("strategyStatus", step.status)}
              <span className="sr-only"> ({S[step.state]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
