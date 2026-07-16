"use client";

import { InputHTMLAttributes, useId, useState } from "react";

export function Field({
  label,
  error,
  className = "",
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const errorId = useId();
  // Password fields get a show/hide (eye) toggle — B-067.
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const base =
    "w-full rounded-lg border bg-pioneer px-3 py-2 text-sm text-cosmic outline-none transition-colors focus:ring-2";
  // Red border + ring when the field has an error, otherwise the normal venture focus.
  const state = error
    ? "border-danger focus:border-danger focus:ring-danger/30"
    : "border-cosmic/15 focus:border-venture focus:ring-venture/30";
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-cosmic/80">{label}</span>
      <span className="relative block">
        <input
          type={isPassword && show ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${base} ${state} ${isPassword ? "pr-10" : ""} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-cosmic/45 transition-colors hover:text-cosmic focus:outline-none focus-visible:ring-2 focus-visible:ring-venture/40"
          >
            {show ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.9" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                <path d="m3 3 18 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </span>
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
