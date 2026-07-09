// Lock-in (B-055). For the first LOCK_IN_MONTHS an investor invests only through
// their cohort; after that they'd be eligible to invest directly in a single
// startup (that direct-investment flow is a separate future feature — this just
// computes/exposes the eligibility). The clock starts at the investor's first
// successful (confirmed) contribution.
//
// 24 is indicative per the PM; change it here in one place.
export const LOCK_IN_MONTHS = 24;

export type LockIn = { started: boolean; unlockDate: string | null; eligible: boolean; months: number };

export function lockInStatus(firstConfirmedAt: string | Date | null | undefined): LockIn {
  if (!firstConfirmedAt) return { started: false, unlockDate: null, eligible: false, months: LOCK_IN_MONTHS };
  const start = new Date(firstConfirmedAt);
  const unlock = new Date(start);
  unlock.setMonth(unlock.getMonth() + LOCK_IN_MONTHS);
  return { started: true, unlockDate: unlock.toISOString(), eligible: new Date() >= unlock, months: LOCK_IN_MONTHS };
}
