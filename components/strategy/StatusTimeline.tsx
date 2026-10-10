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

const styles: Record<StepState, string> = {
  done: "bg-primary-tint text-primary",
  current: "bg-primary text-white",
  pending: "bg-[#EEF1F0] text-muted",
};
const terminalStyles: Partial<Record<StrategyStatus, string>> = {
  rejected: "bg-alert text-white",
  expired: "bg-sidebar text-white",
};

/** Lifecycle line: Borrador → En el plan → Aprobada → Programada → Activa → Medida, plus the terminal states. */
export function StatusTimeline({ status }: { status: StrategyStatus }) {
  const steps = buildSteps(status);
  return (
    <ol aria-label={S.label} className="flex flex-wrap items-center gap-y-2 text-xs">
      {steps.map((step, i) => {
        const terminal = step.status === "rejected" || step.status === "expired";
        const cls = step.state === "current" && terminal ? (terminalStyles[step.status] ?? styles.current) : styles[step.state];
        return (
          <li key={step.status} aria-current={step.state === "current" ? "step" : undefined} className="flex items-center">
            {i > 0 && <span aria-hidden className="mx-1 h-px w-3 bg-line" />}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${cls}`}>
              {step.state === "done" && <span aria-hidden>✓</span>}
              {t("strategyStatus", step.status)}
              <span className="sr-only"> ({S[step.state]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
