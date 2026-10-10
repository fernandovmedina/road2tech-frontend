import { formatSignedMoney, formatUnits } from "@/lib/copilot/format";
import type { StrategyCandidate } from "@/types/copilot";

type CandidatesTableProps = { candidates: StrategyCandidate[] };

/** Every simulated option, viable first: rejected ones show the rule they broke. */
export function CandidatesTable({ candidates }: CandidatesTableProps) {
  if (candidates.length === 0) return null;
  const viable = candidates.filter((c) => c.viable).length;
  return (
    <details className="text-sm" open={viable === 0}>
      <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-accent">
        Simulated options ({viable} viable, {candidates.length - viable} rejected)
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-muted text-ink-secondary">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Option</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Net impact</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Waste avoided</th>
              <th scope="col" className="px-3 py-2 font-medium">Result</th>
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
                    <span className="text-good-ink">✓ Viable</span>
                  ) : (
                    <span className="text-critical-ink">✕ {c.violations[0]}</span>
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
