import { copy } from "@/lib/copy";
import type { Strategy } from "@/types";

const R = copy.product.promo;
const MAX_BULLETS = 3;
const MAX_CHARS = 110;

/** First sentence of the backend explanation, cut to a short line. The full text lives in "¿Cómo se calculó?". */
function shortExplanation(text: string): string | null {
  const first = text.trim().split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
  if (!first) return null;
  return first.length > MAX_CHARS ? `${first.slice(0, MAX_CHARS - 1).trimEnd()}…` : first;
}

/** At most three short reasons: the first sentence of the explanation (when there is one) and the translated drivers. */
function reasonBullets(strategy: Pick<Strategy, "drivers" | "explanation">): string[] {
  const extra = shortExplanation(strategy.explanation);
  const drivers = strategy.drivers.slice(0, extra ? MAX_BULLETS - 1 : MAX_BULLETS).map((d) => R.reasons[d]);
  return extra ? [...drivers, extra] : drivers;
}

/** "POR QUÉ LA SUGIERE LA IA": three bullets, no paragraphs. */
export function StrategyReasons({ strategy }: { strategy: Pick<Strategy, "drivers" | "explanation"> }) {
  const bullets = reasonBullets(strategy);
  if (bullets.length === 0) return null;
  return (
    <section aria-label={R.reasonsTitle}>
      <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">{R.reasonsTitle}</h3>
      <ul className="flex flex-col gap-2 text-sm leading-snug">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {b}
          </li>
        ))}
      </ul>
    </section>
  );
}
