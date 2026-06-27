import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { startups, startupDocuments } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, startupApprovedEmail, startupRejectedEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [startup] = await db.select().from(startups).where(eq(startups.id, id));
  if (!startup) return NextResponse.json({ error: "not found" }, { status: 404 });

  const documents = await db
    .select({ id: startupDocuments.id, kind: startupDocuments.kind, filename: startupDocuments.filename, uploadedAt: startupDocuments.uploadedAt })
    .from(startupDocuments)
    .where(eq(startupDocuments.startupId, id))
    .orderBy(desc(startupDocuments.uploadedAt));

  return NextResponse.json({ startup, documents });
}

// Approve or reject a submitted startup.
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

  const [startup] = await db.select().from(startups).where(eq(startups.id, id));
  if (!startup) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["submitted", "under_review"].includes(startup.status)) {
    return NextResponse.json({ error: "Only a submitted startup can be reviewed." }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const [updated] = await db
    .update(startups)
    .set({ status, rejectionReason: action === "reject" ? reason : null, updatedAt: new Date() })
    .where(eq(startups.id, id))
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: action === "approve" ? "startup.approved" : "startup.rejected",
    targetType: "startup",
    targetId: id,
    metadata: action === "reject" ? { reason } : undefined,
  });

  // Notify the founder (no-ops if email unconfigured).
  if (updated.founderEmail) {
    const mail = action === "approve" ? startupApprovedEmail(updated.name) : startupRejectedEmail(updated.name, reason);
    await sendEmail({ to: updated.founderEmail, ...mail });
  }

  return NextResponse.json({ startup: updated });
}
