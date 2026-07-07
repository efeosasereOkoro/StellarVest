import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupTeamMembers } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { validateMember } from "@/lib/team-member";

// Add a team member to the founder's own startup (B-048).
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const [startup] = await db.select({ id: startups.id }).from(startups).where(eq(startups.founderUserId, user.id));
  if (!startup) return NextResponse.json({ error: "Create your startup first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const fields = validateMember(body);
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

  const [member] = await db
    .insert(startupTeamMembers)
    .values({ startupId: startup.id, ...fields.values })
    .returning();

  await recordAudit({ actorId: user.id, actorEmail: user.email, action: "startup.team.added", targetType: "startup", targetId: startup.id, metadata: { memberId: member.id } });
  return NextResponse.json({ member });
}
