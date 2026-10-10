type ErrorCardProps = { message: string };

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div role="alert" className="my-2 flex gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm">
      <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-critical text-xs font-bold text-white">
        !
      </span>
      <div>
        <p className="font-medium">The copilot could not complete this analysis</p>
        <p className="mt-0.5 text-ink-secondary">{message}</p>
      </div>
    </div>
  );
}
