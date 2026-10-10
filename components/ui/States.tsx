import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { Button } from "./Button";

export function ErrorState({ onRetry, className = "" }: { onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 rounded-2xl border border-alert/30 bg-alert-tint p-8 text-center ${className}`}>
      <p className="text-base font-bold text-alert-dark">{copy.common.errorTitle}</p>
      <p className="max-w-sm text-sm text-alert-dark/80">{copy.common.errorText}</p>
      {onRetry && <Button variant="danger" size="sm" onClick={onRetry}>{copy.common.retry}</Button>}
    </div>
  );
}

export function EmptyState({ title, text, action, className = "" }: { title?: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white p-8 text-center ${className}`}>
      <p className="text-base font-bold">{title ?? copy.common.emptyTitle}</p>
      <p className="max-w-sm text-sm text-muted">{text ?? copy.common.emptyText}</p>
      {action}
    </div>
  );
}
