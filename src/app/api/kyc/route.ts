import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { kycDocuments, investorProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";

async function requireUser(req: Request) {
  if (!req.headers.get("authorization")) return { error: "missing token" as const };
  const user = await getAuthUser(req);
  if (!user) return { error: "invalid token" as const };
  return { user };
}

// The investor's KYC state: status, intake fields, and uploaded documents.
// Uploads and submission are handled by /api/kyc/document and /api/kyc/submit
// (individual uploads keep each request under Vercel's ~4.5MB body limit).
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const documents = await db
    .select({ id: kycDocuments.id, kind: kycDocuments.kind, filename: kycDocuments.filename, uploadedAt: kycDocuments.uploadedAt })
    .from(kycDocuments)
    .where(eq(kycDocuments.userId, auth.user.id))
    .orderBy(desc(kycDocuments.uploadedAt));

  const [prof] = await db
    .select({
      kycStatus: investorProfiles.kycStatus,
      rejectionReason: investorProfiles.kycRejectionReason,
      residency: investorProfiles.residency,
      nin: investorProfiles.nin,
      residentialAddress: investorProfiles.residentialAddress,
      idType: investorProfiles.idType,
      idNumber: investorProfiles.idNumber,
    })
    .from(investorProfiles)
    .where(eq(investorProfiles.userId, auth.user.id));

  return NextResponse.json({
    documents,
    kycStatus: prof?.kycStatus ?? "registered",
    rejectionReason: prof?.rejectionReason ?? null,
    residency: prof?.residency ?? null,
    nin: prof?.nin ?? null,
    residentialAddress: prof?.residentialAddress ?? null,
    idType: prof?.idType ?? null,
    idNumber: prof?.idNumber ?? null,
  });
}
