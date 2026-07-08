import { NextResponse } from "next/server";
import { sum } from "drizzle-orm";
import { db } from "@/db";
import {
  investorCohorts,
  investmentPools,
  startupCohorts,
  cohortMembers,
  disbursements,
  portfolioStartups,
} from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Returns investor cohorts (top-level, with pool + member count) plus the list
// of portfolios (startup cohorts).
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [cohorts, pools, members, startups, disb, pfStartups] = await Promise.all([
    db.select().from(investorCohorts),
    db.select().from(investmentPools),
    db.select({ cohortId: cohortMembers.investorCohortId }).from(cohortMembers),
    db.select().from(startupCohorts),
    db.select({ scId: disbursements.startupCohortId, total: sum(disbursements.amount) }).from(disbursements).groupBy(disbursements.startupCohortId),
    db.select({ scId: portfolioStartups.startupCohortId }).from(portfolioStartups),
  ]);

  return NextResponse.json({
    cohorts: cohorts
      .sort((a, b) => +a.createdAt - +b.createdAt)
      .map((c) => ({
        id: c.id,
        name: c.name,
        hasPool: pools.some((p) => p.investorCohortId === c.id),
        memberCount: members.filter((m) => m.cohortId === c.id).length,
      })),
    startupCohorts: startups
      .sort((a, b) => +a.createdAt - +b.createdAt)
      .map((sc) => ({
        id: sc.id,
        name: sc.name,
        disbursedTotal: disb.find((d) => d.scId === sc.id)?.total ?? "0",
        startupCount: pfStartups.filter((p) => p.scId === sc.id).length,
      })),
  });
}
