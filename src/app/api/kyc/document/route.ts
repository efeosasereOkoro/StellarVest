import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { kycDocuments } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (Vercel request body limit ~4.5MB)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
// Investor kinds + founder identity-verification kinds (B-074) — the same
// upload slot mechanics serve both audiences.
const KINDS = ["photograph", "nin_doc", "utility_bill", "id_doc", "founder_photo", "founder_id", "founder_utility_bill"];

// Upload one KYC document, tagged with its kind. One request per file keeps us
// under Vercel's body limit. Replaces any earlier document of the same kind so
// re-uploading just updates that slot. Submission happens via /api/kyc/submit.
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "");
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 4MB)." }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP, or PDF." }, { status: 400 });
  }

  let blob;
  try {
    blob = await put(`kyc/${user.id}/${kind}/${file.name}`, file, { access: "private", addRandomSuffix: true });
  } catch {
    return NextResponse.json({ error: "File storage isn't available right now." }, { status: 503 });
  }

  // One document per kind — drop any previous slot entry before inserting.
  await db.delete(kycDocuments).where(and(eq(kycDocuments.userId, user.id), eq(kycDocuments.kind, kind)));

  const [document] = await db
    .insert(kycDocuments)
    .values({
      userId: user.id,
      kind,
      pathname: blob.pathname,
      url: blob.url,
      filename: file.name,
      contentType: file.type || null,
      size: file.size,
    })
    .returning({ id: kycDocuments.id, kind: kycDocuments.kind, filename: kycDocuments.filename, uploadedAt: kycDocuments.uploadedAt });

  return NextResponse.json({ document });
}
