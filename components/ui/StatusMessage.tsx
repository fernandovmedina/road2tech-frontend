import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type StatusMessageProps = {
  tone: "empty" | "error";
  title: string;
  description: string;
  action?: ReactNode;
};

/** Empty and error states: icon + title + guidance, never color alone. */
export function StatusMessage({ tone, title, description, action }: StatusMessageProps) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
    >
      {isError ? (
        <TriangleAlert className="size-6 text-alert" aria-hidden />
      ) : (
        <Info className="size-6 text-subtle" aria-hidden />
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
