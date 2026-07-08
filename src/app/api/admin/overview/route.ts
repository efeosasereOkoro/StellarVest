import { NextResponse } from "next/server";
import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { investorProfiles, investorCohorts, deals, contributions, startups, startupUpdates } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Counts for the admin home overview.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [
    pendingKyc, verifiedInvestors, cohortCount,
    publishedDeals, awaitingFunds, dealsUnderReview, startupsAwaitingReview, startupCount,
    updatesAwaitingReview,
  ] = await Promise.all([
    db.select({ c: count() }).from(investorProfiles).where(eq(investorProfiles.kycStatus, "submitted")),
    db.select({ c: count() }).from(investorProfiles).where(eq(investorProfiles.kycStatus, "verified")),
    db.select({ c: count() }).from(investorCohorts),
    db.select({ c: count() }).from(deals).where(eq(deals.status, "published")),
    db.select({ c: count() }).from(contributions).where(eq(contributions.status, "paid")),
    db.select({ c: count() }).from(deals).where(eq(deals.status, "under_review")),
    db.select({ c: count() }).from(startups).where(inArray(startups.status, ["submitted", "under_review"])),
    db.select({ c: count() }).from(startups),
    db.select({ c: count() }).from(startupUpdates).where(eq(startupUpdates.status, "pending")),
  ]);

  return NextResponse.json({
    pendingKyc: pendingKyc[0]?.c ?? 0,
    verifiedInvestors: verifiedInvestors[0]?.c ?? 0,
    cohortCount: cohortCount[0]?.c ?? 0,
    publishedDeals: publishedDeals[0]?.c ?? 0,
    awaitingFunds: awaitingFunds[0]?.c ?? 0,
    dealsUnderReview: dealsUnderReview[0]?.c ?? 0,
    startupsAwaitingReview: startupsAwaitingReview[0]?.c ?? 0,
    startupCount: startupCount[0]?.c ?? 0,
    updatesAwaitingReview: updatesAwaitingReview[0]?.c ?? 0,
  });
}
