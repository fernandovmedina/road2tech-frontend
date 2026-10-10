import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EventFactProps = {
  icon?: LucideIcon;
  label: string;
  wide?: boolean;
  children: ReactNode;
};

/** One labeled fact in the event details grid; render inside a <dl>. */
export function EventFact({ icon: Icon, label, wide = false, children }: EventFactProps) {
  return (
    <div className={cn(wide && "col-span-2")}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-1 flex flex-col gap-1.5 font-medium text-ink">{children}</dd>
    </div>
  );
}
