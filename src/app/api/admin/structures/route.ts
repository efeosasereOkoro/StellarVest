import { NextResponse } from "next/server";
import { sum } from "drizzle-orm";
import { db } from "@/db";
import {
  syndicates,
  investorCohorts,
  investmentPools,
  startupCohorts,
  cohortMembers,
  disbursements,
} from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Returns the full structure tree: syndicates → investor cohorts (with pool + member count),
// plus the list of startup cohorts.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [syns, cohorts, pools, members, startups, disb] = await Promise.all([
    db.select().from(syndicates),
    db.select().from(investorCohorts),
    db.select().from(investmentPools),
    db.select({ cohortId: cohortMembers.investorCohortId }).from(cohortMembers),
    db.select().from(startupCohorts),
    db.select({ scId: disbursements.startupCohortId, total: sum(disbursements.amount) }).from(disbursements).groupBy(disbursements.startupCohortId),
  ]);

  const data = syns
    .sort((a, b) => +a.createdAt - +b.createdAt)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      cohorts: cohorts
        .filter((c) => c.syndicateId === s.id)
        .map((c) => ({
          id: c.id,
          name: c.name,
          hasPool: pools.some((p) => p.investorCohortId === c.id),
          memberCount: members.filter((m) => m.cohortId === c.id).length,
        })),
    }));

  return NextResponse.json({
    syndicates: data,
    startupCohorts: startups
      .sort((a, b) => +a.createdAt - +b.createdAt)
      .map((sc) => ({ id: sc.id, name: sc.name, disbursedTotal: disb.find((d) => d.scId === sc.id)?.total ?? "0" })),
  });
}
