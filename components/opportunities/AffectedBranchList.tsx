import { formatDistance } from "@/lib/format";
import type { AffectedBranch } from "@/types/eventPrediction";

type AffectedBranchListProps = {
  branches: readonly AffectedBranch[];
  branchNames: ReadonlyMap<string, string>;
};

export function AffectedBranchList({ branches, branchNames }: AffectedBranchListProps) {
  if (branches.length === 0) {
    return <p className="text-sm text-ink-secondary">No branch is inside the influence radius.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {branches.map((branch) => (
        <li
          key={branch.branchId}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface px-2.5 py-1 text-xs"
        >
          <span className="size-2 rounded-[2px] bg-ink" aria-hidden />
          <span className="font-medium text-ink">
            {branchNames.get(branch.branchId) ?? branch.branchId}
          </span>
          <span className="text-ink-secondary">{formatDistance(branch.distanceMeters)}</span>
        </li>
      ))}
    </ul>
  );
}
