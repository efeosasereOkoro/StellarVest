import { NextResponse } from "next/server";
import { db } from "@/db";
import { syndicates } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [syndicate] = await db
    .insert(syndicates)
    .values({ name, description: description || null })
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "syndicate.created",
    targetType: "syndicate",
    targetId: syndicate.id,
    metadata: { name },
  });

  return NextResponse.json({ syndicate });
}
