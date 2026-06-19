import { InputHTMLAttributes } from "react";

export function Field({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-cosmic/80">{label}</span>
      <input
        className={`w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm text-cosmic outline-none transition-colors focus:border-venture focus:ring-2 focus:ring-venture/30 ${className}`}
        {...props}
      />
    </label>
  );
}
