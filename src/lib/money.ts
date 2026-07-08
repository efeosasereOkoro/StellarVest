// Money + units (B4). The platform's base currency is the Nigerian naira, and
// the accounting primitive is the "unit": ₦1,000 = 1 unit. Amounts are stored
// in naira; units are derived from the naira amount (fixed ratio).

export const NAIRA_PER_UNIT = 1000;

// Format a naira amount as e.g. "₦150,000" (₦ symbol guaranteed).
export function naira(amount: string | number): string {
  const n = Number(amount) || 0;
  return "₦" + new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(n);
}

// Units for a naira amount (₦1,000 = 1 unit). May be fractional (₦1,500 = 1.5).
export function toUnits(amount: string | number): number {
  return (Number(amount) || 0) / NAIRA_PER_UNIT;
}

// e.g. "150 units", "1 unit", "1.5 units".
export function unitsLabel(amount: string | number): string {
  const u = toUnits(amount);
  const s = Number.isInteger(u) ? String(u) : u.toFixed(2).replace(/\.?0+$/, "");
  return `${s} ${u === 1 ? "unit" : "units"}`;
}

// Combined display, e.g. "₦150,000 · 150 units".
export function nairaWithUnits(amount: string | number): string {
  return `${naira(amount)} · ${unitsLabel(amount)}`;
}
