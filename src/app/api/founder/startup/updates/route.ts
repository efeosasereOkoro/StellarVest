import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupUpdates } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";

// Approved founder posts an update to investors (E11-S4).
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const [startup] = await db.select().from(startups).where(eq(startups.founderUserId, user.id));
  if (!startup) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (startup.status !== "approved") {
    return NextResponse.json({ error: "You can post updates once your startup is approved." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text) return NextResponse.json({ error: "Add a title and an update." }, { status: 400 });

  const [update] = await db.insert(startupUpdates).values({ startupId: startup.id, title, body: text }).returning();

  await recordAudit({ actorId: user.id, actorEmail: user.email, action: "startup.update_posted", targetType: "startup", targetId: startup.id });

  await notifyAdmins({
    type: "update.posted",
    title: "Founder update awaiting review",
    body: `${startup.name} posted “${title}” for moderation.`,
    href: "/admin/updates",
  });
  return NextResponse.json({ update });
}
