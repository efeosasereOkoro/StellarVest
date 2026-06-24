import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { getVerifiedInvestor } from "@/lib/investor";

// Verified investors see the list of published deals.
export async function GET(req: Request) {
  if (!req.headers.get("authorization")) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }
  const investor = await getVerifiedInvestor(req);
  if (!investor) {
    // Distinguish "not signed in" from "signed in but not verified" so the UI
    // can prompt the right next step.
    const user = await getAuthUser(req);
    return NextResponse.json(
      { error: user ? "not_verified" : "invalid token" },
      { status: user ? 403 : 401 },
    );
  }

  const published = await db
    .select({
      id: deals.id,
      startupName: deals.startupName,
      description: deals.description,
      publishedAt: deals.publishedAt,
    })
    .from(deals)
    .where(eq(deals.status, "published"))
    .orderBy(desc(deals.publishedAt));

  return NextResponse.json({ deals: published });
}
