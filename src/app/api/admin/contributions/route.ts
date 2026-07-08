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

  return NextResponse.json({ contributions: rows });
}
