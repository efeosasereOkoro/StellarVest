import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { startupCohorts, portfolioStartups, startups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Startups in a portfolio + the approved startups that can still be added.
export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [portfolio] = await db.select({ id: startupCohorts.id, name: startupCohorts.name }).from(startupCohorts).where(eq(startupCohorts.id, id));
  if (!portfolio) return NextResponse.json({ error: "not found" }, { status: 404 });

  const members = await db
    .select({ id: startups.id, name: startups.name, stage: startups.stage })
    .from(portfolioStartups)
    .innerJoin(startups, eq(startups.id, portfolioStartups.startupId))
    .where(eq(portfolioStartups.startupCohortId, id));

  const approved = await db
    .select({ id: startups.id, name: startups.name })
    .from(startups)
    .where(eq(startups.status, "approved"));

  const memberIds = new Set(members.map((m) => m.id));
  const assignable = approved.filter((s) => !memberIds.has(s.id));

  return NextResponse.json({ portfolio, startups: members, assignable });
}

// Add an approved startup to the portfolio.
export async function POST(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const startupId = String(body.startupId ?? "");
  if (!startupId) return NextResponse.json({ error: "startupId is required." }, { status: 400 });

  const [startup] = await db.select({ status: startups.status }).from(startups).where(eq(startups.id, startupId));
  if (!startup || startup.status !== "approved") {
    return NextResponse.json({ error: "Only approved startups can be added." }, { status: 400 });
  }

  await db.insert(portfolioStartups).values({ startupCohortId: id, startupId }).onConflictDoNothing();
  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "portfolio.startup_added", targetType: "startup_cohort", targetId: id, metadata: { startupId } });
  return NextResponse.json({ ok: true });
}

// Remove a startup from the portfolio.
export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const startupId = String(body.startupId ?? "");
  if (!startupId) return NextResponse.json({ error: "startupId is required." }, { status: 400 });

  await db.delete(portfolioStartups).where(and(eq(portfolioStartups.startupCohortId, id), eq(portfolioStartups.startupId, startupId)));
  await recordAudit({ actorId: admin.id, actorEmail: admin.email, action: "portfolio.startup_removed", targetType: "startup_cohort", targetId: id, metadata: { startupId } });
  return NextResponse.json({ ok: true });
}
