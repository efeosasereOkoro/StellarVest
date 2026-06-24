import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

  await db.insert(committeeReviews).values({
    dealId: id,
    reviewerId: reviewer.id,
    reviewerEmail: reviewer.email,
    recommendation,
    comment: comment || null,
  });

  await recordAudit({
    actorId: reviewer.id,
    actorEmail: reviewer.email,
    action: "deal.review_added",
    targetType: "deal",
    targetId: id,
    metadata: { recommendation },
  });

  return NextResponse.json({ ok: true });
}
