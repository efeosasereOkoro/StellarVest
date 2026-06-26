import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { investorCohorts, cohortMembers, investmentPools, allocations } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Rename an investor cohort.
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [updated] = await db.update(investorCohorts).set({ name }).where(eq(investorCohorts.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "cohort.renamed", targetType: "investor_cohort", targetId: id, metadata: { name } });
  return NextResponse.json({ cohort: updated });
}

// Delete a cohort — only once it has no members and no allocations. Its empty
// pool (if one was created) is cleaned up.
export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [{ c: members }] = await db.select({ c: count() }).from(cohortMembers).where(eq(cohortMembers.investorCohortId, id));
  if (members > 0) return NextResponse.json({ error: "Remove its members first." }, { status: 400 });

  const [pool] = await db.select({ id: investmentPools.id }).from(investmentPools).where(eq(investmentPools.investorCohortId, id));
  if (pool) {
    const [{ c: allocs }] = await db.select({ c: count() }).from(allocations).where(eq(allocations.poolId, pool.id));
    if (allocs > 0) return NextResponse.json({ error: "Remove its allocations first." }, { status: 400 });
    await db.delete(investmentPools).where(eq(investmentPools.id, pool.id));
  }

  const [deleted] = await db.delete(investorCohorts).where(eq(investorCohorts.id, id)).returning({ id: investorCohorts.id });
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "cohort.deleted", targetType: "investor_cohort", targetId: id });
  return NextResponse.json({ ok: true });
}
