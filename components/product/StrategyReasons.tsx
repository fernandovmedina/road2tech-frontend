import { copy } from "@/lib/copy";
import { Card } from "@/components/ui/Card";
import type { Strategy } from "@/types";

const R = copy.product.reasons;

/** Why the engine proposes this strategy: translated drivers, the explanation and the model's assumptions. */
export function StrategyReasons({ strategy }: { strategy: Strategy }) {
  const driverText: Record<string, { label: string; text: string }> = copy.strategy.drivers;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{R.title}</h2>
      <p className="text-sm leading-relaxed">{strategy.explanation}</p>

      {strategy.drivers.length > 0 && (
        <section aria-label={R.drivers}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{R.drivers}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {strategy.drivers.map((d) => {
              const info = driverText[d];
              return (
                <li key={d} className="rounded-[10px] bg-background p-3 text-sm">
                  <span className="font-bold">{info?.label ?? d}</span>
                  {info && <span className="text-muted"> — {info.text}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {strategy.assumptions.length > 0 && (
        <section aria-label={R.assumptions}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{R.assumptions}</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">
            {strategy.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
