import { HTMLAttributes } from "react";

type Tone = "venture" | "pitch" | "ignition" | "neutral";

const TONES: Record<Tone, string> = {
  venture: "bg-frontier text-deep-frontier",
  pitch: "bg-pitch text-deep-pitch",
  ignition: "bg-ignition/15 text-ignition-ink",
  neutral: "bg-cosmic/8 text-cosmic/70",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}
