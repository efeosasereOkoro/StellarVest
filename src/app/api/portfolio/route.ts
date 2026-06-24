import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions, deals } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

// A verified investor's own contributions, newest first, with the deal name.
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: contributions.id,
      dealId: contributions.dealId,
      startupName: deals.startupName,
      amount: contributions.amount,
      currency: contributions.currency,
      reference: contributions.reference,
      status: contributions.status,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .innerJoin(deals, eq(deals.id, contributions.dealId))
    .where(eq(contributions.userId, investor.id))
    .orderBy(desc(contributions.createdAt));

  return NextResponse.json({ contributions: rows });
}
