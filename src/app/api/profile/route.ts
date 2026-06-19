import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investorProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(investorProfiles)
    .where(eq(investorProfiles.userId, user.id));

  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "").trim();
  if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });

  const [profile] = await db
    .insert(investorProfiles)
    .values({ userId: user.id, fullName })
    .onConflictDoUpdate({
      target: investorProfiles.userId,
      set: { fullName, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ profile });
}
