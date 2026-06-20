import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { db } from "@/db";
import { kycDocuments } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Streams a private KYC document to an authorised admin (never exposes a public URL).
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [doc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const result = await get(doc.pathname, { access: "private" });
  if (!result) return NextResponse.json({ error: "file unavailable" }, { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || doc.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
