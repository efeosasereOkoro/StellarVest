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

// The founder's LinkedIn is mandatory for trust/investor confidence (B-066).
// Accepts a linkedin.com profile URL with or without protocol/www/country
// subdomain, but it must point at an actual page (a path after the domain).
// Shared by the founder form (inline error) and the API (server backstop).
export function isLinkedinUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?linkedin\.com\/[^\s]{2,}$/i.test(raw.trim());
}
