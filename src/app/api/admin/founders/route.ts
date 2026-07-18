import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { founderProfiles, kycDocuments, startups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, founderVerifiedEmail, founderRejectedEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { FOUNDER_DOCS } from "@/lib/kyc";

// Founder identity verification queue (B-074, D-019) — mirrors the investor
// KYC review: list submitted founders with their documents; verify or reject
// (reason required) with email + in-app notification.

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const profiles = await db
    .select()
    .from(founderProfiles)
    .where(eq(founderProfiles.verificationStatus, "submitted"));

  const ids = profiles.map((p) => p.userId);
  const founderKinds = FOUNDER_DOCS.map((d) => d.kind);
  const docs = ids.length
    ? await db
        .select({
          id: kycDocuments.id,
          userId: kycDocuments.userId,
          kind: kycDocuments.kind,
          filename: kycDocuments.filename,
          uploadedAt: kycDocuments.uploadedAt,
        })
        .from(kycDocuments)
        .where(inArray(kycDocuments.userId, ids))
        .orderBy(desc(kycDocuments.uploadedAt))
    : [];
  const ventures = ids.length
    ? await db.select({ founderUserId: startups.founderUserId, name: startups.name }).from(startups).where(inArray(startups.founderUserId, ids))
    : [];

  const queue = profiles.map((p) => ({
    userId: p.userId,
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    linkedin: p.linkedin,
    residentialAddress: p.residentialAddress,
    idType: p.idType,
    idNumber: p.idNumber,
    startupName: ventures.find((v) => v.founderUserId === p.userId)?.name ?? null,
    documents: docs.filter((d) => d.userId === p.userId && founderKinds.includes(d.kind ?? "")),
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
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

  const [profile] = await db.select().from(founderProfiles).where(eq(founderProfiles.userId, userId));
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (profile.verificationStatus !== "submitted") {
    return NextResponse.json({ error: "Only a submitted verification can be reviewed." }, { status: 400 });
  }

  const status = action === "verify" ? "verified" : "rejected";
  const [updated] = await db
    .update(founderProfiles)
    .set({ verificationStatus: status, rejectionReason: action === "reject" ? reason : null, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(founderProfiles.userId, userId))
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: action === "verify" ? "founder.verified" : "founder.verification_rejected",
    targetType: "founder",
    targetId: userId,
    metadata: action === "reject" ? { reason } : undefined,
  });

  if (updated.email) {
    const mail = action === "verify" ? founderVerifiedEmail() : founderRejectedEmail(reason);
    await sendEmail({ to: updated.email, ...mail });
  }
  await notify({
    userId,
    type: action === "verify" ? "founder.verified" : "founder.verification_rejected",
    title: action === "verify" ? "Your identity is verified" : "Your verification needs attention",
    body: action === "verify"
      ? "Your founder identity is verified — you can now submit your startup for review."
      : `Your identity verification wasn't approved: ${reason}`,
    href: "/founder",
  });

  return NextResponse.json({ updated });
}
