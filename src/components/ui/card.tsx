import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-cosmic/10 bg-pioneer p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}
