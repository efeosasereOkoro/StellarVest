// Startup stages shown on the founder profile (walkthrough-2 Q1). The value is
// the stored label; `help` is the faint one-line explanation under the select.
export const STARTUP_STAGES = [
  { value: "Pre-Seed", help: "Building and validating your product or MVP." },
  { value: "Seed", help: "You have launched and are gaining early customers or traction." },
  { value: "Pre-Series A", help: "You have proven traction and are preparing to scale." },
];

export function stageHelp(value: string | null | undefined): string | undefined {
  return STARTUP_STAGES.find((s) => s.value === value)?.help;
}
