import { NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealDocuments, committeeReviews, investorProfiles, contributions } from "@/db/schema";
import { getAdminUser, getAdminEmails } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, dealNeedsReviewEmail, dealPublishedEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

const TRANSITIONS: Record<string, { from: string; to: string }> = {
  send_to_committee: { from: "draft", to: "under_review" },
  approve: { from: "under_review", to: "approved" },
  decline: { from: "under_review", to: "declined" },
  publish: { from: "approved", to: "published" },
  // Recovery transitions (audit findings A2/I4 — let admins undo a mistake).
  reopen: { from: "declined", to: "under_review" },
  unpublish: { from: "published", to: "approved" },
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

  // Don't allow unpublishing once investors have contributed.
  if (action === "unpublish") {
    const [{ c }] = await db.select({ c: count() }).from(contributions).where(eq(contributions.dealId, id));
    if (c > 0) {
      return NextResponse.json({ error: "Can't unpublish — investors have already contributed to this deal." }, { status: 400 });
    }
  }

  const set: Record<string, unknown> = { status: t.to, updatedAt: new Date() };
  if (action === "publish") set.publishedAt = new Date();
  if (action === "unpublish") set.publishedAt = null;
  const [updated] = await db.update(deals).set(set).where(eq(deals.id, id)).returning();

  const auditAction =
    action === "reopen" ? "deal.reopened" : action === "unpublish" ? "deal.unpublished" : `deal.${t.to}`;
  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: auditAction,
    targetType: "deal",
    targetId: id,
  });

  // Tell the committee a deal needs review (no-ops if email unconfigured).
  if (t.to === "under_review") {
    const mail = dealNeedsReviewEmail(updated.startupName, id);
    await Promise.all(getAdminEmails().map((to) => sendEmail({ to, ...mail })));
  }

  // Announce a newly published deal to verified investors.
  if (t.to === "published") {
    const investors = await db
      .select({ email: investorProfiles.email })
      .from(investorProfiles)
      .where(and(eq(investorProfiles.kycStatus, "verified"), isNotNull(investorProfiles.email)));
    const mail = dealPublishedEmail(updated.startupName, id);
    await Promise.all(investors.map((i) => sendEmail({ to: i.email as string, ...mail })));
  }

  return NextResponse.json({ deal: updated });
}
