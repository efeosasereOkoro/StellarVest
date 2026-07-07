import { InputHTMLAttributes, useId } from "react";

export function Field({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const errorId = useId();
  const base =
    "w-full rounded-lg border bg-pioneer px-3 py-2 text-sm text-cosmic outline-none transition-colors focus:ring-2";
  // Red border + ring when the field has an error, otherwise the normal venture focus.
  const state = error
    ? "border-danger focus:border-danger focus:ring-danger/30"
    : "border-cosmic/15 focus:border-venture focus:ring-venture/30";
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-cosmic/80">{label}</span>
      <input
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${base} ${state} ${className}`}
        {...props}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
