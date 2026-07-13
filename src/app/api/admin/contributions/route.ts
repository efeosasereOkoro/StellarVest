import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions, deals, investorCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// All contributions, newest first (admin reconciliation view). Contributions
// target a cohort (B1); legacy rows may still reference a deal — leftJoin both
// so neither kind is dropped.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      dealId: contributions.dealId,
      startupName: deals.startupName,
      cohortName: investorCohorts.name,
      investorEmail: contributions.investorEmail,
      amount: contributions.amount,
      currency: contributions.currency,
      reference: contributions.reference,
      status: contributions.status,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .leftJoin(deals, eq(deals.id, contributions.dealId))
    .leftJoin(investorCohorts, eq(investorCohorts.id, contributions.investorCohortId))
    .orderBy(desc(contributions.createdAt));

  // Totals (Q5): confirmed only in the headline totals, pending shown separately;
  // "contributors" = distinct investors with ≥1 confirmed contribution.
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const pending = rows.filter((r) => r.status === "pledged" || r.status === "paid");
  const sumN = (arr: typeof rows) => arr.reduce((s, r) => s + Number(r.amount), 0);

  const perCohortMap: Record<string, number> = {};
  for (const r of confirmed) {
    const key = r.cohortName ?? (r.startupName ? `${r.startupName} (per-deal)` : "Unassigned");
    perCohortMap[key] = (perCohortMap[key] ?? 0) + Number(r.amount);
  }
  const perCohort = Object.entries(perCohortMap)
    .map(([name, amount]) => ({ name, amount: amount.toFixed(2) }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  const summary = {
    confirmed: sumN(confirmed).toFixed(2),
    pending: sumN(pending).toFixed(2),
    contributors: new Set(confirmed.map((r) => r.userId)).size,
    perCohort,
  };

  return NextResponse.json({ contributions: rows, summary });
}
