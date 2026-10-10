import { RISK_PRESENTATION } from "@/lib/opportunities/storePresentation";

export function StoreMapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1001] rounded-xl border border-ink/10 bg-surface/95 px-3 py-2 text-xs text-ink shadow-sm backdrop-blur-sm">
      <p className="mb-1.5 font-medium text-ink-secondary">Stock coverage</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(RISK_PRESENTATION) as (keyof typeof RISK_PRESENTATION)[]).map((risk) => (
          <li key={risk} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: RISK_PRESENTATION[risk].color }} aria-hidden />
            {RISK_PRESENTATION[risk].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
