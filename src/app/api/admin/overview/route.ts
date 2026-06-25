import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { investorProfiles, syndicates, investorCohorts, deals, contributions } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Counts for the admin home overview.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [pendingKyc, verifiedInvestors, syndicateCount, cohortCount, publishedDeals, awaitingFunds] = await Promise.all([
    db.select({ c: count() }).from(investorProfiles).where(eq(investorProfiles.kycStatus, "submitted")),
    db.select({ c: count() }).from(investorProfiles).where(eq(investorProfiles.kycStatus, "verified")),
    db.select({ c: count() }).from(syndicates),
    db.select({ c: count() }).from(investorCohorts),
    db.select({ c: count() }).from(deals).where(eq(deals.status, "published")),
    db.select({ c: count() }).from(contributions).where(eq(contributions.status, "paid")),
  ]);

  return NextResponse.json({
    pendingKyc: pendingKyc[0]?.c ?? 0,
    verifiedInvestors: verifiedInvestors[0]?.c ?? 0,
    syndicateCount: syndicateCount[0]?.c ?? 0,
    cohortCount: cohortCount[0]?.c ?? 0,
    publishedDeals: publishedDeals[0]?.c ?? 0,
    awaitingFunds: awaitingFunds[0]?.c ?? 0,
  });
}
