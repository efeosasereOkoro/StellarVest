import { NextResponse } from "next/server";
import { and, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { cohortMembers, investorCohorts, investorProfiles, contributions } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

async function gate(req: Request) {
  const admin = await getAdminUser(req);
  return admin ?? null;
}

export async function GET(req: Request, { params }: Ctx) {
  const admin = await gate(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [cohort] = await db
    .select({ id: investorCohorts.id, name: investorCohorts.name })
    .from(investorCohorts)
    .where(eq(investorCohorts.id, id));
  if (!cohort) return NextResponse.json({ error: "not found" }, { status: 404 });

  const members = await db
    .select({
      userId: cohortMembers.userId,
      fullName: investorProfiles.fullName,
      kycStatus: investorProfiles.kycStatus,
    })
    .from(cohortMembers)
    .leftJoin(investorProfiles, eq(investorProfiles.userId, cohortMembers.userId))
    .where(eq(cohortMembers.investorCohortId, id));

  const verified = await db
    .select({ userId: investorProfiles.userId, fullName: investorProfiles.fullName })
    .from(investorProfiles)
    .where(eq(investorProfiles.kycStatus, "verified"));

  const memberIds = new Set(members.map((m) => m.userId));
  const assignable = verified.filter((v) => !memberIds.has(v.userId));

  // Pool total = confirmed contributions made directly to this cohort (B1).
  const [poolRow] = await db
    .select({ total: sum(contributions.amount) })
    .from(contributions)
    .where(and(eq(contributions.investorCohortId, id), eq(contributions.status, "confirmed")));
  const poolTotal = poolRow?.total ?? "0";

  return NextResponse.json({ cohort, members, assignable, poolTotal });
}

export async function POST(req: Request, { params }: Ctx) {
  const admin = await gate(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  // Only verified investors can be assigned.
  const [investor] = await db
    .select({ kycStatus: investorProfiles.kycStatus })
    .from(investorProfiles)
    .where(eq(investorProfiles.userId, userId));
  if (!investor || investor.kycStatus !== "verified") {
    return NextResponse.json({ error: "Only verified investors can be assigned." }, { status: 400 });
  }

  await db
    .insert(cohortMembers)
    .values({ investorCohortId: id, userId })
    .onConflictDoNothing();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "cohort.member_added",
    targetType: "investor_cohort",
    targetId: id,
    metadata: { userId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await gate(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await db
    .delete(cohortMembers)
    .where(and(eq(cohortMembers.investorCohortId, id), eq(cohortMembers.userId, userId)));

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "cohort.member_removed",
    targetType: "investor_cohort",
    targetId: id,
    metadata: { userId },
  });

  return NextResponse.json({ ok: true });
}
