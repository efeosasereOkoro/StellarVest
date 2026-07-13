import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationReads } from "@/db/schema";
import { getAuthUser, isAdminEmail } from "@/lib/auth-server";

// Mark notifications read for the current user. Body { id } marks one; no body
// marks all visible ones read. Read state is per-user (works for broadcasts).
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : null;

  let ids: string[];
  if (id) {
    ids = [id];
  } else {
    const admin = isAdminEmail(user.email);
    const audience = admin
      ? or(eq(notifications.recipientUserId, user.id), eq(notifications.recipientRole, "admin"))
      : eq(notifications.recipientUserId, user.id);
    const rows = await db.select({ id: notifications.id }).from(notifications).where(audience).orderBy(desc(notifications.createdAt)).limit(100);
    ids = rows.map((r) => r.id);
  }

  if (ids.length) {
    await db
      .insert(notificationReads)
      .values(ids.map((notificationId) => ({ notificationId, userId: user.id })))
      .onConflictDoNothing();
  }

  return NextResponse.json({ ok: true });
}
