import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-white text-foreground border border-line hover:bg-background",
  ghost: "bg-transparent text-primary hover:bg-primary-tint",
  danger: "bg-alert text-white hover:bg-alert-dark",
  accent: "bg-accent text-white hover:bg-accent-dark",
};
const sizes: Record<Size, string> = { md: "min-h-11 px-4 text-sm", sm: "min-h-10 px-3 text-sm" };

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
