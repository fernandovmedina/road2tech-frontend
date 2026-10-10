import type { ReactNode } from "react";

export type Tone = "green" | "orange" | "red" | "blue" | "gray" | "amber";
const tones: Record<Tone, string> = {
  green: "bg-primary-tint text-primary",
  orange: "bg-accent-tint text-accent-dark",
  red: "bg-alert-tint text-alert-dark",
  blue: "bg-info-tint text-info",
  amber: "bg-warning-tint text-warning-dark",
  gray: "bg-line text-muted",
};

export function Badge({ tone = "gray", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
