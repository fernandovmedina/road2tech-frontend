import { copy } from "@/lib/copy";
import { formatSignedMoney, formatUnits } from "@/lib/copilot/format";
import type { StrategyCandidate } from "@/types/copilot";

const C = copy.copilot.strategy.candidates;

type CandidatesTableProps = { candidates: StrategyCandidate[] };

/** Every simulated option, viable first: rejected ones show the rule they broke. */
export function CandidatesTable({ candidates }: CandidatesTableProps) {
  if (candidates.length === 0) return null;
  const viable = candidates.filter((c) => c.viable).length;
  return (
    <details className="text-sm" open={viable === 0}>
      <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">
        {C.summary(viable, candidates.length - viable)}
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-block border border-line">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-background text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{C.option}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{C.net}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{C.waste}</th>
              <th scope="col" className="px-3 py-2 font-medium">{C.result}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.candidate_id} className="border-t border-line align-top">
                <td className="px-3 py-2">{c.title}</td>
                <td className="tabular px-3 py-2 text-right">{formatSignedMoney(c.expected_net_impact)}</td>
                <td className="tabular px-3 py-2 text-right">{formatUnits(c.expected_waste_reduction)}</td>
                <td className="px-3 py-2">
                  {c.viable ? (
                    <span className="text-primary-hover">{C.viable}</span>
                  ) : (
                    <span className="text-alert-dark">{C.rejected(c.violations[0] ?? "")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
