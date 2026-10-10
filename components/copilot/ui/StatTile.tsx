type Tone = "neutral" | "good" | "bad";

type StatTileProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
};

const DETAIL_TONE: Record<Tone, string> = {
  neutral: "text-ink-muted",
  good: "text-good-ink",
  bad: "text-critical-ink",
};

export function StatTile({ label, value, detail, tone = "neutral" }: StatTileProps) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted px-3.5 py-3">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-tight">{value}</p>
      {detail ? <p className={`mt-0.5 text-xs ${DETAIL_TONE[tone]}`}>{detail}</p> : null}
    </div>
  );
}
