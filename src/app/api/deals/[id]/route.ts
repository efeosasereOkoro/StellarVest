import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealDocuments, contributions, platformSettings, startupDocuments } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

type Ctx = { params: Promise<{ id: string }> };

// A verified investor reads a single published deal and its Deal Room documents.
export async function GET(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [deal] = await db
    .select({
      id: deals.id,
      startupId: deals.startupId,
      startupName: deals.startupName,
      description: deals.description,
      fundingGoal: deals.fundingGoal,
      valuation: deals.valuation,
      terms: deals.terms,
      publishedAt: deals.publishedAt,
    })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.status, "published")));
  // Only published deals are visible to investors — drafts/under-review/declined 404.
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });

  const documents = await db
    .select({ id: dealDocuments.id, filename: dealDocuments.filename, uploadedAt: dealDocuments.uploadedAt })
    .from(dealDocuments)
    .where(eq(dealDocuments.dealId, id))
    .orderBy(desc(dealDocuments.uploadedAt));

  // The investor's own contribution to this deal (if any), so the page can show
  // the pledge form, funding instructions, or current status.
  const [contribution] = await db
    .select()
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));

  // Escrow funding instructions the admin maintains (shown when pledged).
  const [settings] = await db
    .select({ escrowInstructions: platformSettings.escrowInstructions })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1));

  // Documents pulled from the linked approved startup (single source of truth).
  const founderDocuments = deal.startupId
    ? await db
        .select({ id: startupDocuments.id, kind: startupDocuments.kind, filename: startupDocuments.filename, uploadedAt: startupDocuments.uploadedAt })
        .from(startupDocuments)
        .where(eq(startupDocuments.startupId, deal.startupId))
        .orderBy(desc(startupDocuments.uploadedAt))
    : [];

  return NextResponse.json({
    deal,
    documents,
    founderDocuments,
    contribution: contribution ?? null,
    escrowInstructions: settings?.escrowInstructions ?? "",
  });
}
