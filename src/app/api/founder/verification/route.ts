import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { founderProfiles, kycDocuments } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { FOUNDER_DOCS, ID_TYPES } from "@/lib/kyc";

// Founder identity verification (B-074, D-019 — CEO: "high level of
// compliance and verification to everyone on the platform"). Documents are
// uploaded beforehand via /api/kyc/document (founder_photo / founder_id);
// this validates the set + ID details and moves the founder to "submitted".
// The team verifies or rejects on /admin/kyc; free resubmission (D-012).
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const [profile] = await db.select().from(founderProfiles).where(eq(founderProfiles.userId, user.id));
  if (!profile) {
    return NextResponse.json({ error: "Complete your founder profile first." }, { status: 400 });
  }
  if (profile.verificationStatus === "verified" || profile.verificationStatus === "submitted") {
    return NextResponse.json({ error: "Your verification is already " + profile.verificationStatus + "." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const idType = String(body.idType ?? "").trim();
  const idNumber = String(body.idNumber ?? "").trim();

  const fields: Record<string, string> = {};
  if (!ID_TYPES.some((t) => t.value === idType)) fields.idType = "Choose your ID type.";
  if (!idNumber) fields.idNumber = "Your ID number is required.";
  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Some required details are missing.", fields }, { status: 400 });
  }

  // Both documents must already be uploaded.
  const kinds = FOUNDER_DOCS.map((d) => d.kind);
  const docs = await db
    .select({ kind: kycDocuments.kind })
    .from(kycDocuments)
    .where(and(eq(kycDocuments.userId, user.id), inArray(kycDocuments.kind, kinds)));
  const have = new Set(docs.map((d) => d.kind));
  const missingDocs = FOUNDER_DOCS.filter((d) => !have.has(d.kind)).map((d) => d.kind);
  if (missingDocs.length) {
    return NextResponse.json({ error: "Some required documents are missing.", docs: missingDocs }, { status: 400 });
  }

  await db
    .update(founderProfiles)
    .set({ idType, idNumber, verificationStatus: "submitted", rejectionReason: null, updatedAt: new Date() })
    .where(eq(founderProfiles.userId, user.id));

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "founder.verification_submitted",
    targetType: "founder",
    targetId: user.id,
  });

  await notifyAdmins({
    type: "founder.verification_submitted",
    title: "Founder verification submitted",
    body: `${profile.fullName} (${user.email ?? "no email"}) submitted identity documents for review.`,
    href: "/admin/kyc",
  });

  return NextResponse.json({ verificationStatus: "submitted" });
}
