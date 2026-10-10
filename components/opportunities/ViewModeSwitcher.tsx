import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { copy } from "@/lib/copy";
import {
  type OpportunityViewMode,
  VIEW_MODE_LABELS,
  VIEW_MODES,
} from "@/lib/opportunities/viewModes";

const OPTIONS = VIEW_MODES.map((mode) => ({ value: mode, label: VIEW_MODE_LABELS[mode] }));

type ViewModeSwitcherProps = {
  value: OpportunityViewMode;
  onChange: (mode: OpportunityViewMode) => void;
};

export function ViewModeSwitcher({ value, onChange }: ViewModeSwitcherProps) {
  return (
    <SegmentedControl
      label={copy.opportunities.viewMode.label}
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
