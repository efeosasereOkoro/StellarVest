import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealDocuments, committeeReviews } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const TRANSITIONS: Record<string, { from: string; to: string }> = {
  send_to_committee: { from: "draft", to: "under_review" },
  approve: { from: "under_review", to: "approved" },
  decline: { from: "under_review", to: "declined" },
  publish: { from: "approved", to: "published" },
};

export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });

  const documents = await db
    .select({ id: dealDocuments.id, filename: dealDocuments.filename, uploadedAt: dealDocuments.uploadedAt })
    .from(dealDocuments)
    .where(eq(dealDocuments.dealId, id))
    .orderBy(desc(dealDocuments.uploadedAt));

  const reviews = await db
    .select()
    .from(committeeReviews)
    .where(eq(committeeReviews.dealId, id))
    .orderBy(desc(committeeReviews.createdAt));

  return NextResponse.json({ deal, documents, reviews });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const t = TRANSITIONS[action];
  if (!t) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (deal.status !== t.from) {
    return NextResponse.json({ error: `Can't do that — the deal is "${deal.status}".` }, { status: 400 });
  }

  const set: Record<string, unknown> = { status: t.to, updatedAt: new Date() };
  if (t.to === "published") set.publishedAt = new Date();
  const [updated] = await db.update(deals).set(set).where(eq(deals.id, id)).returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `deal.${t.to}`,
    targetType: "deal",
    targetId: id,
  });

  return NextResponse.json({ deal: updated });
}
