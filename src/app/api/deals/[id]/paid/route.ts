import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Investor marks their pledged contribution as paid (funds sent to escrow).
export async function POST(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [existing] = await db
    .select({ id: contributions.id, status: contributions.status })
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));
  if (!existing) return NextResponse.json({ error: "No pledge found for this deal." }, { status: 404 });
  if (existing.status !== "pledged") {
    return NextResponse.json({ error: "This contribution can't be marked paid." }, { status: 400 });
  }

  const [updated] = await db
    .update(contributions)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(contributions.id, existing.id))
    .returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.paid",
    targetType: "deal",
    targetId: id,
    metadata: { reference: updated.reference },
  });

  return NextResponse.json({ contribution: updated });
}
