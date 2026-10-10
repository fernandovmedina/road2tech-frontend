import { Kpi } from "./Kpi";

type StatTileProps = {
  label: string;
  value: string;
  caption?: string;
};

/** Legacy alias of `Kpi`; kept for the existing `components/opportunities/*` usages (removed in T09). */
export function StatTile({ label, value, caption }: StatTileProps) {
  return <Kpi label={label} value={value} caption={caption} />;
}
