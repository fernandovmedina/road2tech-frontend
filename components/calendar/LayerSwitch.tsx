import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { copy } from "@/lib/copy";

/**
 * Calendar context layer toggle, rendered with the standard segmented control
 * (dark = selected). `label` is the layer name and the accessible group name.
 */
export function LayerSwitch({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div aria-describedby={hint ? `${id}-hint` : undefined}>
      <SegmentedControl
        label={label}
        options={[
          { value: "off", label: copy.calendar.contextOff },
          { value: "on", label },
        ]}
        value={checked ? "on" : "off"}
        onChange={(v) => onChange(v === "on")}
      />
      {hint && <span id={`${id}-hint`} className="sr-only">{hint}</span>}
    </div>
  );
}
