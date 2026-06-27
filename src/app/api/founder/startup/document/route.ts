import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { db } from "@/db";
import { startups, startupDocuments } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";

// Streams a founder's own document back to them.
export async function GET(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [row] = await db
    .select({ doc: startupDocuments, founderUserId: startups.founderUserId })
    .from(startupDocuments)
    .innerJoin(startups, eq(startups.id, startupDocuments.startupId))
    .where(eq(startupDocuments.id, id));
  if (!row || row.founderUserId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

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
