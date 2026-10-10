import { copy } from "@/lib/copy";

type ErrorCardProps = { message: string };

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div role="alert" className="my-2 flex gap-3 rounded-card border border-line bg-card px-5 py-4 text-sm">
      <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-alert text-xs font-bold text-white">
        !
      </span>
      <div>
        <p className="font-medium">{copy.copilot.errors.cardTitle}</p>
        <p className="mt-0.5 text-muted">{message}</p>
      </div>
    </div>
  );
}
