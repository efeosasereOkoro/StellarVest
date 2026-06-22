import { NextResponse } from "next/server";
import { db } from "@/db";
import { startupCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [startupCohort] = await db.insert(startupCohorts).values({ name }).returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "startup_cohort.created",
    targetType: "startup_cohort",
    targetId: startupCohort.id,
    metadata: { name },
  });

  return NextResponse.json({ startupCohort });
}
