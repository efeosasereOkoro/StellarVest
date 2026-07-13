import { NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupDocuments } from "@/db/schema";
import { getAuthUser, getAdminEmails } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, startupSubmittedEmail } from "@/lib/email";

// Founder submits their startup for review (draft / rejected -> submitted).
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const [startup] = await db.select().from(startups).where(eq(startups.founderUserId, user.id));
  if (!startup) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["draft", "rejected", "queried"].includes(startup.status)) {
    return NextResponse.json({ error: "This startup has already been submitted." }, { status: 400 });
  }

  const [{ c }] = await db.select({ c: count() }).from(startupDocuments).where(eq(startupDocuments.startupId, startup.id));
  if (c === 0) return NextResponse.json({ error: "Upload at least one document before submitting." }, { status: 400 });

  await db.update(startups).set({ status: "submitted", rejectionReason: null, updatedAt: new Date() }).where(eq(startups.id, startup.id));

  await recordAudit({ actorId: user.id, actorEmail: user.email, action: "startup.submitted", targetType: "startup", targetId: startup.id });

  // Notify admins (no-ops if email unconfigured).
  const mail = startupSubmittedEmail(startup.name);
  await Promise.all(getAdminEmails().map((to) => sendEmail({ to, ...mail })));

  return NextResponse.json({ ok: true });
}
