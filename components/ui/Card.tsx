import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-line bg-white p-5 ${className}`} {...rest} />;
}
