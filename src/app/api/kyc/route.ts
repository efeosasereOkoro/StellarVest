import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { kycDocuments, investorProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (Vercel request body limit ~4.5MB)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function requireUser(req: Request) {
  if (!req.headers.get("authorization")) return { error: "missing token" as const };
  const user = await getAuthUser(req);
  if (!user) return { error: "invalid token" as const };
  return { user };
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const documents = await db
    .select({ id: kycDocuments.id, filename: kycDocuments.filename, uploadedAt: kycDocuments.uploadedAt })
    .from(kycDocuments)
    .where(eq(kycDocuments.userId, auth.user.id))
    .orderBy(desc(kycDocuments.uploadedAt));

  const prof = await db
    .select({ kycStatus: investorProfiles.kycStatus })
    .from(investorProfiles)
    .where(eq(investorProfiles.userId, auth.user.id));

  return NextResponse.json({ documents, kycStatus: prof[0]?.kycStatus ?? "registered" });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 4MB)." }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP, or PDF." }, { status: 400 });
  }

  // Store privately in Vercel Blob. Auth is handled by the SDK — a
  // BLOB_READ_WRITE_TOKEN locally, or OIDC + BLOB_STORE_ID on Vercel.
  let blob;
  try {
    blob = await put(`kyc/${auth.user.id}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });
  } catch {
    return NextResponse.json({ error: "File storage isn't available right now." }, { status: 503 });
  }

  const [document] = await db
    .insert(kycDocuments)
    .values({
      userId: auth.user.id,
      pathname: blob.pathname,
      url: blob.url,
      filename: file.name,
      contentType: file.type || null,
      size: file.size,
    })
    .returning({ id: kycDocuments.id, filename: kycDocuments.filename, uploadedAt: kycDocuments.uploadedAt });

  // Ensure a profile row exists and move KYC to "submitted".
  await db
    .insert(investorProfiles)
    .values({ userId: auth.user.id, kycStatus: "submitted" })
    .onConflictDoUpdate({
      target: investorProfiles.userId,
      set: { kycStatus: "submitted", updatedAt: new Date() },
    });

  return NextResponse.json({ document, kycStatus: "submitted" });
}
