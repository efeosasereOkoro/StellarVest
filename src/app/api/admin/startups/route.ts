import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { startups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// All startups for the admin review list, newest activity first.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({ id: startups.id, name: startups.name, status: startups.status, founderEmail: startups.founderEmail, updatedAt: startups.updatedAt })
    .from(startups)
    .orderBy(desc(startups.updatedAt));

  return NextResponse.json({ startups: rows });
}
