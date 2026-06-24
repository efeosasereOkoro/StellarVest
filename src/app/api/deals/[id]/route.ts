import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealDocuments } from "@/db/schema";
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
      startupName: deals.startupName,
      description: deals.description,
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

  return NextResponse.json({ deal, documents });
}
