import { SegmentedControl } from "@/components/ui/SegmentedControl";

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
    <div>
      <SegmentedControl
        label={label}
        options={[
          { value: "off", label: "Sin contexto" }, // TODO(copy): move "Sin contexto" to lib/copy.ts (read-only in this task)
          { value: "on", label },
        ]}
        value={checked ? "on" : "off"}
        onChange={(v) => onChange(v === "on")}
      />
      {hint && <span id={`${id}-hint`} className="sr-only">{hint}</span>}
    </div>
  );
}
