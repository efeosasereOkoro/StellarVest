import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

const SINGLETON_ID = 1;

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.id, SINGLETON_ID));
  return NextResponse.json({ escrowInstructions: row?.escrowInstructions ?? "" });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const escrowInstructions = String(body.escrowInstructions ?? "").trim();

  await db
    .insert(platformSettings)
    .values({ id: SINGLETON_ID, escrowInstructions })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { escrowInstructions, updatedAt: new Date() },
    });

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "settings.escrow_updated",
    targetType: "settings",
    targetId: String(SINGLETON_ID),
  });

  return NextResponse.json({ escrowInstructions });
}
