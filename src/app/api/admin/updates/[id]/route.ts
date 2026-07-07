import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { startupUpdates } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Approve or reject a founder update (B-049). Approve → investors see it;
// reject → hidden, with a reason the founder can see (parity with KYC/deal/
// startup rejections — D-012).
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
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 });
  }

  const [existing] = await db.select({ id: startupUpdates.id }).from(startupUpdates).where(eq(startupUpdates.id, id));
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status = action === "approve" ? "approved" : "rejected";
  const [update] = await db
    .update(startupUpdates)
    .set({ status, rejectionReason: action === "reject" ? reason : null, reviewedAt: new Date() })
    .where(eq(startupUpdates.id, id))
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: action === "approve" ? "update.approved" : "update.rejected",
    targetType: "startup_update",
    targetId: id,
    metadata: action === "reject" ? { reason } : undefined,
  });

  return NextResponse.json({ update });
}
