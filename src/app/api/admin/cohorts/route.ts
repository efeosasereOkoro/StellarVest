import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investorCohorts, investmentPools, syndicates } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

// Create an investor cohort under a syndicate; auto-creates its investment pool.
export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const syndicateId = String(body.syndicateId ?? "");
  const name = String(body.name ?? "").trim();
  if (!syndicateId || !name) {
    return NextResponse.json({ error: "Syndicate and name are required." }, { status: 400 });
  }

  const [syn] = await db.select().from(syndicates).where(eq(syndicates.id, syndicateId));
  if (!syn) return NextResponse.json({ error: "Syndicate not found." }, { status: 404 });

  const [cohort] = await db
    .insert(investorCohorts)
    .values({ syndicateId, name })
    .returning();
  await db.insert(investmentPools).values({ investorCohortId: cohort.id });

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "cohort.created",
    targetType: "investor_cohort",
    targetId: cohort.id,
    metadata: { name, syndicateId },
  });

  return NextResponse.json({ cohort });
}
