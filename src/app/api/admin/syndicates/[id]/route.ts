import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { syndicates, investorCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Rename a syndicate (name + optional description).
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const set: Record<string, unknown> = { name };
  if (typeof body.description === "string") set.description = body.description.trim() || null;

  const [updated] = await db.update(syndicates).set(set).where(eq(syndicates.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "syndicate.renamed", targetType: "syndicate", targetId: id, metadata: { name } });
  return NextResponse.json({ syndicate: updated });
}

// Delete a syndicate — only if it has no cohorts.
export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [{ c }] = await db.select({ c: count() }).from(investorCohorts).where(eq(investorCohorts.syndicateId, id));
  if (c > 0) return NextResponse.json({ error: "Remove its cohorts first." }, { status: 400 });

  const [deleted] = await db.delete(syndicates).where(eq(syndicates.id, id)).returning({ id: syndicates.id });
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });

  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "syndicate.deleted", targetType: "syndicate", targetId: id });
  return NextResponse.json({ ok: true });
}
