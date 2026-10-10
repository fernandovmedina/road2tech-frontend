import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "inset" | "highlight";

const variants: Record<CardVariant, string> = {
  default: "rounded-card border border-line bg-card shadow-card p-5",
  inset: "rounded-block bg-background p-4",
  highlight: "rounded-card bg-sidebar text-white shadow-card p-5",
};

export function Card({
  variant = "default",
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn(variants[variant], className)} {...rest} />;
}
