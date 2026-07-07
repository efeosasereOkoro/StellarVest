import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contributions } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

// Aggregated contribution totals for the signed-in verified investor (B-044).
// "confirmed" = money the escrow has reconciled (the cumulative headline);
// "pending" = pledged/paid but not yet confirmed. Cancelled is ignored.
// Grouped by currency so a future multi-currency world (B-053) still totals correctly.
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      currency: contributions.currency,
      status: contributions.status,
      total: sql<string>`sum(${contributions.amount})`,
    })
    .from(contributions)
    .where(eq(contributions.userId, investor.id))
    .groupBy(contributions.currency, contributions.status);

  const confirmed: Record<string, number> = {};
  const pending: Record<string, number> = {};
  for (const r of rows) {
    const amount = Number(r.total ?? 0);
    if (!amount) continue;
    if (r.status === "confirmed") {
      confirmed[r.currency] = (confirmed[r.currency] ?? 0) + amount;
    } else if (r.status === "pledged" || r.status === "paid") {
      pending[r.currency] = (pending[r.currency] ?? 0) + amount;
    }
  }

  return NextResponse.json({ confirmed, pending });
}
