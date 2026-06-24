import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await db.select().from(deals).orderBy(desc(deals.createdAt));
  return NextResponse.json({ deals: rows });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const startupName = String(body.startupName ?? "").trim();
  const description = String(body.description ?? "").trim();
  if (!startupName) return NextResponse.json({ error: "Startup name is required." }, { status: 400 });

  const [deal] = await db
    .insert(deals)
    .values({ startupName, description: description || null })
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "deal.created",
    targetType: "deal",
    targetId: deal.id,
    metadata: { startupName },
  });

  return NextResponse.json({ deal });
}
