import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-cosmic text-pioneer hover:bg-cosmic/90",
  accent: "bg-venture text-cosmic hover:brightness-95",
  outline: "border border-cosmic/15 text-cosmic hover:bg-cosmic/5",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
