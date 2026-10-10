export function LayerSwitch({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold hover:bg-background"
      >
        <span aria-hidden className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-[#C9D1CE]"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
        </span>
        {label}
      </button>
      {hint && <span id={`${id}-hint`} className="sr-only">{hint}</span>}
    </div>
  );
}
