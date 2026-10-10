import { cn } from "@/lib/cn";

type ScenarioFigureProps = {
  label: string;
  value: string;
  swatchClassName?: string;
};

/** A headline scenario value with an optional series swatch; render inside a <dl>. */
export function ScenarioFigure({ label, value, swatchClassName }: ScenarioFigureProps) {
  return (
    <div>
      <dt className="flex items-start gap-1.5 text-xs text-muted">
        {swatchClassName && (
          <span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", swatchClassName)} aria-hidden />
        )}
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</dd>
    </div>
  );
}
