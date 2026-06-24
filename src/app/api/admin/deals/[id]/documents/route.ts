import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { deals, dealDocuments } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function GET(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const documents = await db
    .select({ id: dealDocuments.id, filename: dealDocuments.filename, uploadedAt: dealDocuments.uploadedAt })
    .from(dealDocuments)
    .where(eq(dealDocuments.dealId, id))
    .orderBy(desc(dealDocuments.uploadedAt));
  return NextResponse.json({ documents });
}

export async function POST(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, id));
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 4MB)." }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP, or PDF." }, { status: 400 });
  }

  let blob;
  try {
    blob = await put(`deals/${id}/${file.name}`, file, { access: "private", addRandomSuffix: true });
  } catch {
    return NextResponse.json({ error: "File storage isn't available right now." }, { status: 503 });
  }

  const [document] = await db
    .insert(dealDocuments)
    .values({
      dealId: id,
      pathname: blob.pathname,
      url: blob.url,
      filename: file.name,
      contentType: file.type || null,
      size: file.size,
    })
    .returning({ id: dealDocuments.id, filename: dealDocuments.filename, uploadedAt: dealDocuments.uploadedAt });

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "deal.document_added",
    targetType: "deal",
    targetId: id,
    metadata: { filename: file.name },
  });

  return NextResponse.json({ document });
}
