import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cohortMembers, investorCohorts, investmentPools, allocations, startupCohorts, portfolioStartups } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

// Level 1 of the investor portfolio drill-down (B-054): the portfolios the
// investor's cohort pool is allocated across (with allocation % + startup count).
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [membership] = await db
    .select({ cohortId: cohortMembers.investorCohortId, cohortName: investorCohorts.name })
    .from(cohortMembers)
    .innerJoin(investorCohorts, eq(investorCohorts.id, cohortMembers.investorCohortId))
    .where(eq(cohortMembers.userId, investor.id))
    .limit(1);
  if (!membership) return NextResponse.json({ cohort: null, portfolios: [] });

  const [pool] = await db.select({ id: investmentPools.id }).from(investmentPools).where(eq(investmentPools.investorCohortId, membership.cohortId));

  let portfolios: { id: string; name: string; percentage: number; startupCount: number }[] = [];
  if (pool) {
    const allocs = await db
      .select({ id: startupCohorts.id, name: startupCohorts.name, percentage: allocations.percentage })
      .from(allocations)
      .innerJoin(startupCohorts, eq(startupCohorts.id, allocations.startupCohortId))
      .where(eq(allocations.poolId, pool.id));
    const counts = await db.select({ scId: portfolioStartups.startupCohortId }).from(portfolioStartups);
    portfolios = allocs.map((a) => ({
      id: a.id,
      name: a.name,
      percentage: a.percentage,
      startupCount: counts.filter((c) => c.scId === a.id).length,
    }));
  }

  return NextResponse.json({ cohort: { id: membership.cohortId, name: membership.cohortName }, portfolios });
}
