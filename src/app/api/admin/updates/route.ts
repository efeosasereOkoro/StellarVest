import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { startupUpdates, startups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// All founder updates for the moderation queue (B-049), newest first, with the
// startup they belong to. The page surfaces pending ones for action.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: startupUpdates.id,
      title: startupUpdates.title,
      body: startupUpdates.body,
      status: startupUpdates.status,
      rejectionReason: startupUpdates.rejectionReason,
      createdAt: startupUpdates.createdAt,
      startupName: startups.name,
      founderEmail: startups.founderEmail,
    })
    .from(startupUpdates)
    .innerJoin(startups, eq(startups.id, startupUpdates.startupId))
    .orderBy(desc(startupUpdates.createdAt));

  return NextResponse.json({ updates: rows });
}
