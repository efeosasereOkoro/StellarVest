import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

// The investor's own contribution (must belong to them).
async function own(req: Request, id: string) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return { error: "forbidden" as const };
  const [row] = await db
    .select({ id: contributions.id, status: contributions.status, reference: contributions.reference, userId: contributions.userId })
    .from(contributions)
    .where(eq(contributions.id, id));
  if (!row || row.userId !== investor.id) return { error: "not found" as const };
  return { investor, row };
}

// PATCH { action: "paid" } — investor reports they've sent the funds (pledged → paid).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const res = await own(req, id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.error === "forbidden" ? 403 : 404 });

  const body = await req.json().catch(() => ({}));
  if (String(body.action) !== "paid") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (res.row.status !== "pledged") {
    return NextResponse.json({ error: "You've already reported this payment." }, { status: 400 });
  }

  const [updated] = await db
    .update(contributions)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(contributions.id, id))
    .returning();

  await recordAudit({
    actorId: res.investor.id, actorEmail: res.investor.email,
    action: "contribution.paid", targetType: "contribution", targetId: id,
    metadata: { reference: res.row.reference },
  });

  await notifyAdmins({
    type: "contribution.paid",
    title: "Payment reported",
    body: `${res.investor.email ?? "An investor"} reported sending funds (ref ${res.row.reference}). Reconcile when it clears.`,
    href: "/admin/contributions",
  });
  return NextResponse.json({ contribution: updated });
}

// DELETE — cancel a contribution before reporting payment (pledged only).
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const res = await own(req, id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.error === "forbidden" ? 403 : 404 });
  if (res.row.status !== "pledged") {
    return NextResponse.json({ error: "You can only cancel before reporting payment — contact us if you've already paid." }, { status: 400 });
  }

  const [updated] = await db
    .update(contributions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(contributions.id, id), eq(contributions.userId, res.investor.id)))
    .returning();

  await recordAudit({
    actorId: res.investor.id, actorEmail: res.investor.email,
    action: "contribution.cancelled", targetType: "contribution", targetId: id,
    metadata: { reference: res.row.reference },
  });
  return NextResponse.json({ contribution: updated });
}
