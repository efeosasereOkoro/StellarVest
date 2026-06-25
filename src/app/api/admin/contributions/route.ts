import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions, deals } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// All contributions across deals, newest first (admin reconciliation view).
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: contributions.id,
      dealId: contributions.dealId,
      startupName: deals.startupName,
      investorEmail: contributions.investorEmail,
      amount: contributions.amount,
      currency: contributions.currency,
      reference: contributions.reference,
      status: contributions.status,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .innerJoin(deals, eq(deals.id, contributions.dealId))
    .orderBy(desc(contributions.createdAt));

  return NextResponse.json({ contributions: rows });
}
