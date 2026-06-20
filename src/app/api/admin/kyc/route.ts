import { NextResponse } from "next/server";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { investorProfiles, kycDocuments } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const profiles = await db
    .select()
    .from(investorProfiles)
    .where(eq(investorProfiles.kycStatus, "submitted"));

  const ids = profiles.map((p) => p.userId);
  const docs = ids.length
    ? await db
        .select({
          id: kycDocuments.id,
          userId: kycDocuments.userId,
          filename: kycDocuments.filename,
          uploadedAt: kycDocuments.uploadedAt,
        })
        .from(kycDocuments)
        .where(inArray(kycDocuments.userId, ids))
        .orderBy(desc(kycDocuments.uploadedAt))
    : [];

  const queue = profiles.map((p) => ({
    userId: p.userId,
    fullName: p.fullName,
    kycStatus: p.kycStatus,
    documents: docs.filter((d) => d.userId === p.userId),
  }));

  return NextResponse.json({ queue });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  const action = String(body.action ?? "");
  if (!userId || (action !== "verify" && action !== "reject")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const kycStatus = action === "verify" ? "verified" : "rejected";
  const [updated] = await db
    .update(investorProfiles)
    .set({
      kycStatus,
      kycRejectionReason: action === "reject" ? reason || null : null,
      updatedAt: new Date(),
    })
    .where(eq(investorProfiles.userId, userId))
    .returning({ userId: investorProfiles.userId, kycStatus: investorProfiles.kycStatus });

  if (!updated) return NextResponse.json({ error: "investor not found" }, { status: 404 });
  return NextResponse.json({ updated });
}
