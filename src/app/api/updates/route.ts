import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { startupUpdates, startups } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

// Verified investors see updates from approved startups (E11-S4).
// MVP: broadcast to all verified investors (deals aren't investor-scoped — B-009).
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: startupUpdates.id,
      title: startupUpdates.title,
      body: startupUpdates.body,
      createdAt: startupUpdates.createdAt,
      startupName: startups.name,
    })
    .from(startupUpdates)
    .innerJoin(startups, eq(startups.id, startupUpdates.startupId))
    .where(eq(startups.status, "approved"))
    .orderBy(desc(startupUpdates.createdAt));

  return NextResponse.json({ updates: rows });
}
