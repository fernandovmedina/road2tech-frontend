import { copy } from "@/lib/copy";
import { formatDistance } from "@/lib/format";
import type { AffectedBranch } from "@/types/eventPrediction";

type AffectedBranchListProps = {
  branches: readonly AffectedBranch[];
  branchNames: ReadonlyMap<string, string>;
};

export function AffectedBranchList({ branches, branchNames }: AffectedBranchListProps) {
  if (branches.length === 0) {
    return <p className="text-sm text-muted">{copy.opportunities.affectedBranches.none}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {branches.map((branch) => (
        <li
          key={branch.branchId}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs"
        >
          <span className="size-2 rounded-[2px] bg-foreground" aria-hidden />
          <span className="font-medium text-foreground">
            {branchNames.get(branch.branchId) ?? branch.branchId}
          </span>
          <span className="text-muted">{formatDistance(branch.distanceMeters)}</span>
        </li>
      ))}
    </ul>
  );
}
