import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { db } from "@/db";
import { deals, dealDocuments } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";

// Streams a Deal Room document to a verified investor — but only when the
// document belongs to a published deal.
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [row] = await db
    .select({ doc: dealDocuments, status: deals.status })
    .from(dealDocuments)
    .innerJoin(deals, eq(deals.id, dealDocuments.dealId))
    .where(eq(dealDocuments.id, id));
  if (!row || row.status !== "published") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const result = await get(row.doc.pathname, { access: "private" });
  if (!result) return NextResponse.json({ error: "file unavailable" }, { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || row.doc.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.doc.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
