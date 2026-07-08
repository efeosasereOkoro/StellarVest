import { NextResponse } from "next/server";
import { db } from "@/db";
import { investorCohorts, investmentPools } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

// Create an investor cohort (top-level); auto-creates its investment pool.
export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [cohort] = await db.insert(investorCohorts).values({ name }).returning();
  await db.insert(investmentPools).values({ investorCohortId: cohort.id });

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "cohort.created",
    targetType: "investor_cohort",
    targetId: cohort.id,
    metadata: { name },
  });

  return NextResponse.json({ cohort });
}
