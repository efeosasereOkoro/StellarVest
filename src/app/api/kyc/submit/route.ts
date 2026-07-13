import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kycDocuments, investorProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, kycReceivedEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";
import { KYC_DOCS, KYC_FIELDS, ID_TYPES, isResidency } from "@/lib/kyc";

// Save the KYC intake fields, verify the required documents are present for the
// investor's residency, and move KYC to "submitted". Documents are uploaded
// beforehand via /api/kyc/document. The client validates first; this is the
// server-side backstop and returns which fields/documents are missing.
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const residency = body.residency;
  if (!isResidency(residency)) {
    return NextResponse.json({ error: "Choose where you're based." }, { status: 400 });
  }

  const nin = String(body.nin ?? "").trim();
  const residentialAddress = String(body.residentialAddress ?? "").trim();
  const idType = String(body.idType ?? "").trim();
  const idNumber = String(body.idNumber ?? "").trim();
  const values = { nin, residentialAddress, idType, idNumber } as Record<string, string>;

  // Required text fields for this residency.
  const missingFields = KYC_FIELDS[residency].filter((f) => !values[f]);
  if (residency === "diaspora" && idType && !ID_TYPES.some((t) => t.value === idType)) {
    missingFields.push("idType");
  }
  if (missingFields.length) {
    return NextResponse.json({ error: "Some required details are missing.", fields: missingFields }, { status: 400 });
  }

  // Required documents (uploaded already, tagged by kind).
  const docs = await db.select({ kind: kycDocuments.kind }).from(kycDocuments).where(eq(kycDocuments.userId, user.id));
  const have = new Set(docs.map((d) => d.kind));
  const missingDocs = KYC_DOCS[residency].filter((d) => !have.has(d.kind)).map((d) => d.kind);
  if (missingDocs.length) {
    return NextResponse.json({ error: "Some required documents are missing.", docs: missingDocs }, { status: 400 });
  }

  await db
    .insert(investorProfiles)
    .values({
      userId: user.id,
      email: user.email ?? null,
      kycStatus: "submitted",
      residency,
      nin: residency === "nigeria" ? nin : null,
      residentialAddress: residency === "nigeria" ? residentialAddress : null,
      idType: residency === "diaspora" ? idType : null,
      idNumber: residency === "diaspora" ? idNumber : null,
    })
    .onConflictDoUpdate({
      target: investorProfiles.userId,
      set: {
        email: user.email ?? null,
        kycStatus: "submitted",
        kycRejectionReason: null,
        residency,
        nin: residency === "nigeria" ? nin : null,
        residentialAddress: residency === "nigeria" ? residentialAddress : null,
        idType: residency === "diaspora" ? idType : null,
        idNumber: residency === "diaspora" ? idNumber : null,
        updatedAt: new Date(),
      },
    });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "kyc.submitted",
    targetType: "investor",
    targetId: user.id,
    metadata: { residency },
  });

  if (user.email) await sendEmail({ to: user.email, ...kycReceivedEmail() });

  await notifyAdmins({
    type: "kyc.submitted",
    title: "New KYC submission",
    body: `${user.email ?? "An investor"} submitted their KYC for review.`,
    href: "/admin/kyc",
  });

  return NextResponse.json({ kycStatus: "submitted" });
}
