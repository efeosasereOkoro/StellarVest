import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { startups, startupDocuments } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const KINDS = ["pitch", "dd", "kyc", "other"];

// Founder uploads a document to their startup (only while editable).
export async function POST(req: Request) {
  if (!req.headers.get("authorization")) return NextResponse.json({ error: "missing token" }, { status: 401 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const [startup] = await db.select().from(startups).where(eq(startups.founderUserId, user.id));
  if (!startup) return NextResponse.json({ error: "Create your startup profile first." }, { status: 400 });
  if (!["draft", "rejected"].includes(startup.status)) {
    return NextResponse.json({ error: "You can only add documents in draft or after a rejection." }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "other");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 4MB)." }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or PDF." }, { status: 400 });

  let blob;
  try {
    blob = await put(`startups/${startup.id}/${kind}/${file.name}`, file, { access: "private", addRandomSuffix: true });
  } catch {
    return NextResponse.json({ error: "File storage isn't available right now." }, { status: 503 });
  }

  const [document] = await db
    .insert(startupDocuments)
    .values({ startupId: startup.id, kind, pathname: blob.pathname, url: blob.url, filename: file.name, contentType: file.type || null, size: file.size })
    .returning({ id: startupDocuments.id, kind: startupDocuments.kind, filename: startupDocuments.filename, uploadedAt: startupDocuments.uploadedAt });

  await recordAudit({ actorId: user.id, actorEmail: user.email, action: "startup.document_added", targetType: "startup", targetId: startup.id, metadata: { kind, filename: file.name } });
  return NextResponse.json({ document });
}
