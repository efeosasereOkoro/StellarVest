import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { waitlistSignups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

// Admin view of the pre-launch waitlist (B-077). Read-only list, newest first.
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: waitlistSignups.id,
      fullName: waitlistSignups.fullName,
      email: waitlistSignups.email,
      interest: waitlistSignups.interest,
      createdAt: waitlistSignups.createdAt,
    })
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));

  return NextResponse.json({ waitlist: rows, total: rows.length });
}
