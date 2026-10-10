import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { copy } from "@/lib/copy";
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
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="text-xs font-medium text-muted">{copy.opportunities.weekdayPicker.label}</p>
      <SegmentedControl
        label={copy.opportunities.weekdayPicker.controlLabel}
        options={OPTIONS}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
