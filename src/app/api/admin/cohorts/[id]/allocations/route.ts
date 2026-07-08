import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentPools, allocations, startupCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

async function poolFor(cohortId: string): Promise<string | null> {
  const [pool] = await db
    .select({ id: investmentPools.id })
    .from(investmentPools)
    .where(eq(investmentPools.investorCohortId, cohortId));
  return pool?.id ?? null;
}

export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const poolId = await poolFor(id);
  if (!poolId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows = await db
    .select({
      id: allocations.id,
      startupCohortId: allocations.startupCohortId,
      percentage: allocations.percentage,
      startupName: startupCohorts.name,
    })
    .from(allocations)
    .leftJoin(startupCohorts, eq(startupCohorts.id, allocations.startupCohortId))
    .where(eq(allocations.poolId, poolId));

  const cohorts = await db.select({ id: startupCohorts.id, name: startupCohorts.name }).from(startupCohorts);
  const totalAllocated = rows.reduce((sum, r) => sum + r.percentage, 0);

  return NextResponse.json({ allocations: rows, startupCohorts: cohorts, totalAllocated });
}

export async function POST(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const poolId = await poolFor(id);
  if (!poolId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const startupCohortId = String(body.startupCohortId ?? "");
  const percentage = Number(body.percentage);
  if (!startupCohortId || !Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
    return NextResponse.json({ error: "Pick a portfolio and a whole percentage from 1 to 100." }, { status: 400 });
  }

  const existing = await db
    .select({ startupCohortId: allocations.startupCohortId, percentage: allocations.percentage })
    .from(allocations)
    .where(eq(allocations.poolId, poolId));
  const otherTotal = existing
    .filter((a) => a.startupCohortId !== startupCohortId)
    .reduce((sum, a) => sum + a.percentage, 0);
  if (otherTotal + percentage > 100) {
    return NextResponse.json(
      { error: `That exceeds 100% — only ${100 - otherTotal}% remaining.` },
      { status: 400 },
    );
  }

  await db
    .insert(allocations)
    .values({ poolId, startupCohortId, percentage })
    .onConflictDoUpdate({
      target: [allocations.poolId, allocations.startupCohortId],
      set: { percentage, updatedAt: new Date() },
    });

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "allocation.set",
    targetType: "investment_pool",
    targetId: poolId,
    metadata: { startupCohortId, percentage },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const poolId = await poolFor(id);
  if (!poolId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const startupCohortId = String(body.startupCohortId ?? "");
  if (!startupCohortId) return NextResponse.json({ error: "startupCohortId required" }, { status: 400 });

  await db
    .delete(allocations)
    .where(and(eq(allocations.poolId, poolId), eq(allocations.startupCohortId, startupCohortId)));

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "allocation.removed",
    targetType: "investment_pool",
    targetId: poolId,
    metadata: { startupCohortId },
  });

  return NextResponse.json({ ok: true });
}
