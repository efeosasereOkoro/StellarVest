import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupTeamMembers } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

// Resolve the member and confirm it belongs to a startup the caller owns.
async function ownedMember(req: Request, memberId: string) {
  if (!req.headers.get("authorization")) return { status: 401 as const, error: "missing token" };
  const user = await getAuthUser(req);
  if (!user) return { status: 401 as const, error: "invalid token" };

  const [row] = await db
    .select({ member: startupTeamMembers, founderUserId: startups.founderUserId })
    .from(startupTeamMembers)
    .innerJoin(startups, eq(startups.id, startupTeamMembers.startupId))
    .where(eq(startupTeamMembers.id, memberId));

  if (!row) return { status: 404 as const, error: "not found" };
  if (row.founderUserId !== user.id) return { status: 403 as const, error: "forbidden" };
  return { user, member: row.member };
}

// Edit a team member.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const res = await ownedMember(req, id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  const body = await req.json().catch(() => ({}));
  const name = str(body.name);
  const role = str(body.role);
  if (!name || !role) return NextResponse.json({ error: "Name and role are required." }, { status: 400 });

  const [member] = await db
    .update(startupTeamMembers)
    .set({ name, role, linkedin: str(body.linkedin), phone: str(body.phone), email: str(body.email), updatedAt: new Date() })
    .where(eq(startupTeamMembers.id, id))
    .returning();

  await recordAudit({ actorId: res.user.id, actorEmail: res.user.email, action: "startup.team.updated", targetType: "startup", targetId: res.member.startupId, metadata: { memberId: id } });
  return NextResponse.json({ member });
}

// Remove a team member.
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const res = await ownedMember(req, id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  await db.delete(startupTeamMembers).where(eq(startupTeamMembers.id, id));
  await recordAudit({ actorId: res.user.id, actorEmail: res.user.email, action: "startup.team.removed", targetType: "startup", targetId: res.member.startupId, metadata: { memberId: id } });
  return NextResponse.json({ ok: true });
}
