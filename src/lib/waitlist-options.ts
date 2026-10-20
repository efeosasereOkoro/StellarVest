// Shared waitlist option lists, used by both the public form (client) and the
// API route (server) so the two never drift.

export type Interest = "investor" | "founder" | "both";

export const INTERESTS: { value: Interest; label: string; hint: string }[] = [
  { value: "investor", label: "Investing", hint: "Back startups through managed cohorts." },
  { value: "founder", label: "Building", hint: "Join as a founder seeking funding and hands-on support." },
  { value: "both", label: "Both", hint: "Investing and building." },
];

export const OUTSIDE_NIGERIA = "Outside Nigeria";

// Investors answer a simple binary.
export const INVESTOR_LOCATIONS = ["Nigeria", OUTSIDE_NIGERIA] as const;

// 36 states plus the FCT.
export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory",
];

// Founders pick a state or outside.
export const FOUNDER_LOCATIONS = [...NIGERIA_STATES, OUTSIDE_NIGERIA];

// Server-side check that a submitted location fits the chosen interest.
// Investors and "both" answer the simple binary; founders pick a state.
export function isValidLocation(interest: string, location: string): boolean {
  if (interest === "investor" || interest === "both") return (INVESTOR_LOCATIONS as readonly string[]).includes(location);
  if (interest === "founder") return FOUNDER_LOCATIONS.includes(location);
  return false;
}
