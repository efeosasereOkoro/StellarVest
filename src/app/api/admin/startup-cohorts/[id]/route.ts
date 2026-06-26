import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { startupCohorts, allocations } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Rename a startup cohort.
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [updated] = await db.update(startupCohorts).set({ name }).where(eq(startupCohorts.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "startup_cohort.renamed", targetType: "startup_cohort", targetId: id, metadata: { name } });
  return NextResponse.json({ startupCohort: updated });
}

// Delete a startup cohort — only if nothing is allocated to it.
export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [{ c }] = await db.select({ c: count() }).from(allocations).where(eq(allocations.startupCohortId, id));
  if (c > 0) return NextResponse.json({ error: "Remove its allocations first." }, { status: 400 });

  const [deleted] = await db.delete(startupCohorts).where(eq(startupCohorts.id, id)).returning({ id: startupCohorts.id });
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "startup_cohort.deleted", targetType: "startup_cohort", targetId: id });
  return NextResponse.json({ ok: true });
}
