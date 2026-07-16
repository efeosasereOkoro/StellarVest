import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cohortMembers, investmentPools, allocations, startupCohorts, portfolioStartups, startups, startupUpdates, startupTeamMembers, founderProfiles } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

type Ctx = { params: Promise<{ id: string }> };

// Level 2 of the drill-down (B-054): the startups inside a portfolio, with each
// startup's approved updates. Authorized: the investor's cohort pool must be
// allocated to this portfolio.
export async function GET(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [membership] = await db.select({ cohortId: cohortMembers.investorCohortId }).from(cohortMembers).where(eq(cohortMembers.userId, investor.id)).limit(1);
  if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [pool] = await db.select({ id: investmentPools.id }).from(investmentPools).where(eq(investmentPools.investorCohortId, membership.cohortId));
  if (!pool) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [alloc] = await db.select({ id: allocations.id }).from(allocations).where(and(eq(allocations.poolId, pool.id), eq(allocations.startupCohortId, id)));
  if (!alloc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [portfolio] = await db.select({ id: startupCohorts.id, name: startupCohorts.name }).from(startupCohorts).where(eq(startupCohorts.id, id));
  if (!portfolio) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Founder identity is public-safe info only (name + LinkedIn — B-065/B-066);
  // phone and address stay internal, same policy as team contact details.
  const members = await db
    .select({
      id: startups.id,
      name: startups.name,
      stage: startups.stage,
      description: startups.description,
      website: startups.website,
      founderName: founderProfiles.fullName,
      founderLinkedin: founderProfiles.linkedin,
    })
    .from(portfolioStartups)
    .innerJoin(startups, eq(startups.id, portfolioStartups.startupId))
    .leftJoin(founderProfiles, eq(founderProfiles.userId, startups.founderUserId))
    .where(eq(portfolioStartups.startupCohortId, id));

  const memberIds = members.map((m) => m.id);
  const updates = memberIds.length
    ? await db
        .select({ startupId: startupUpdates.startupId, title: startupUpdates.title, body: startupUpdates.body, createdAt: startupUpdates.createdAt })
        .from(startupUpdates)
        .where(and(inArray(startupUpdates.startupId, memberIds), eq(startupUpdates.status, "approved")))
        .orderBy(desc(startupUpdates.createdAt))
    : [];

  // Team members — public profile info only (name/role/LinkedIn); phone + email
  // are internal contact details and are not exposed to investors.
  const team = memberIds.length
    ? await db
        .select({ startupId: startupTeamMembers.startupId, name: startupTeamMembers.name, role: startupTeamMembers.role, linkedin: startupTeamMembers.linkedin })
        .from(startupTeamMembers)
        .where(inArray(startupTeamMembers.startupId, memberIds))
    : [];

  const startupsOut = members.map((m) => ({
    ...m,
    updates: updates.filter((u) => u.startupId === m.id),
    team: team.filter((t) => t.startupId === m.id),
  }));

  return NextResponse.json({ portfolio, startups: startupsOut });
}
