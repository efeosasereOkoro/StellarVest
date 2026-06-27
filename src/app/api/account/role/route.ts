import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userAccounts } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

const ROLES = ["investor", "founder"] as const;

// Sets the signed-in user's account role. First choice wins (idempotent) so a
// later login doesn't overwrite it.
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const role = String(body.role ?? "");
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const [existing] = await db.select({ role: userAccounts.role }).from(userAccounts).where(eq(userAccounts.userId, user.id));
  if (existing) return NextResponse.json({ role: existing.role });

  await db.insert(userAccounts).values({ userId: user.id, role: role as (typeof ROLES)[number] }).onConflictDoNothing();
  await recordAudit({ actorId: user.id, actorEmail: user.email, action: "account.role_set", targetType: "user", targetId: user.id, metadata: { role } });

  return NextResponse.json({ role });
}
