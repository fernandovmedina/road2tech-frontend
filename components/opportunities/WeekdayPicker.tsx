import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/opportunities/labels";
import type { Weekday } from "@/types/weekday";

const OPTIONS = WEEKDAY_ORDER.map((weekday) => ({
  value: weekday,
  label: WEEKDAY_LABELS[weekday].slice(0, 3),
}));

type WeekdayPickerProps = {
  value: Weekday;
  onChange: (weekday: Weekday) => void;
};

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-2 rounded-xl border border-ink/10 bg-surface px-4">
      <p className="text-xs font-medium text-ink-secondary">Normal day to inspect</p>
      <SegmentedControl label="Weekday" options={OPTIONS} value={value} onChange={onChange} />
    </div>
  );
}
