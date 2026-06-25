import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, committeeReviews } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const RECOMMENDATIONS = ["approve", "decline", "comment"];

// Committee == admin allowlist for now (D-013).
export async function POST(req: Request, { params }: Ctx) {
  const reviewer = await getAdminUser(req);
  if (!reviewer) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const recommendation = String(body.recommendation ?? "");
  const comment = String(body.comment ?? "").trim();
  if (!RECOMMENDATIONS.includes(recommendation)) {
    return NextResponse.json({ error: "Choose a recommendation." }, { status: 400 });
  }

  const [deal] = await db.select({ status: deals.status }).from(deals).where(eq(deals.id, id));
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (deal.status !== "under_review") {
    return NextResponse.json({ error: "Reviews can only be added while a deal is under committee review." }, { status: 400 });
  }

  // One review per member: update their existing review if present, else insert.
  const [existing] = await db
    .select({ id: committeeReviews.id })
    .from(committeeReviews)
    .where(and(eq(committeeReviews.dealId, id), eq(committeeReviews.reviewerId, reviewer.id)));

  if (existing) {
    await db
      .update(committeeReviews)
      .set({ recommendation, comment: comment || null })
      .where(eq(committeeReviews.id, existing.id));
  } else {
    await db.insert(committeeReviews).values({
      dealId: id,
      reviewerId: reviewer.id,
      reviewerEmail: reviewer.email,
      recommendation,
      comment: comment || null,
    });
  }

  await recordAudit({
    actorId: reviewer.id,
    actorEmail: reviewer.email,
    action: existing ? "deal.review_updated" : "deal.review_added",
    targetType: "deal",
    targetId: id,
    metadata: { recommendation },
  });

  return NextResponse.json({ ok: true });
}
