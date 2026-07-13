import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationReads } from "@/db/schema";
import { getAuthUser, isAdminEmail } from "@/lib/auth-server";

// The signed-in user's notification feed: personal notifications plus role
// broadcasts they're entitled to (admin). Each carries a per-user read flag.
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = isAdminEmail(user.email);

  const audience = admin
    ? or(eq(notifications.recipientUserId, user.id), eq(notifications.recipientRole, "admin"))
    : eq(notifications.recipientUserId, user.id);

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(audience)
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const ids = rows.map((r) => r.id);
  const reads = ids.length
    ? await db
        .select({ notificationId: notificationReads.notificationId })
        .from(notificationReads)
        .where(and(eq(notificationReads.userId, user.id), inArray(notificationReads.notificationId, ids)))
    : [];
  const readSet = new Set(reads.map((r) => r.notificationId));

  const items = rows.map((r) => ({ ...r, read: readSet.has(r.id) }));
  const unread = items.filter((r) => !r.read).length;

  return NextResponse.json({ notifications: items, unread });
}
