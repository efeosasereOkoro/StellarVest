import { NextResponse } from "next/server";
import { desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { disbursements, startupCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// List disbursements + running total for a startup cohort.
export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const rows = await db
    .select()
    .from(disbursements)
    .where(eq(disbursements.startupCohortId, id))
    .orderBy(desc(disbursements.disbursedAt));
  const [agg] = await db.select({ total: sum(disbursements.amount) }).from(disbursements).where(eq(disbursements.startupCohortId, id));

  return NextResponse.json({ disbursements: rows, total: agg?.total ?? "0" });
}

// Record a disbursement to a startup cohort.
export async function POST(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [cohort] = await db.select({ id: startupCohorts.id }).from(startupCohorts).where(eq(startupCohorts.id, id));
  if (!cohort) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Enter an amount of at least $1." }, { status: 400 });
  }
  const note = String(body.note ?? "").trim();

  const [row] = await db
    .insert(disbursements)
    .values({ startupCohortId: id, amount: amount.toFixed(2), note: note || null, recordedByEmail: admin.email })
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "disbursement.recorded",
    targetType: "startup_cohort",
    targetId: id,
    metadata: { amount: amount.toFixed(2) },
  });

  return NextResponse.json({ disbursement: row });
}
