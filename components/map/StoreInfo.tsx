import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import type { Store } from "@/types";

const A = copy.dashboard.analysis;

/** Store card: name, translated zone, size and opening hours. Used in the map tooltip and under the map. */
export function StoreInfo({ store, movement, className = "" }: { store: Store; movement?: number; className?: string }) {
  const zones = [t("zone", store.zone_type), store.secondary_zone_type ? `${A.secondaryZone} ${t("zone", store.secondary_zone_type).toLowerCase()}` : null]
    .filter(Boolean)
    .join(" · ");
  const hours = store.is_24h ? A.open24h : store.opening_hours;

  return (
    <div className={className}>
      <p className="text-sm font-extrabold">{displayBranchName(store)}</p>
      <p className="text-xs">{A.zone}: {zones}</p>
      <p className="text-xs">{A.size}: {t("size", store.size_category)} · {A.hours}: {hours}</p>
      {movement != null && <p className="text-xs">{A.movement}: <span className="font-bold tabular-nums">{movement}</span></p>}
    </div>
  );
}
