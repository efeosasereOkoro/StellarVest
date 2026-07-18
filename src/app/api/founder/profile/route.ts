import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { founderProfiles } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { isLinkedinUrl } from "@/lib/startup";

// Founder profile (B-065) — the person operating the startup, completed
// before the startup profile. LinkedIn is mandatory + validated (B-066).

async function requireUser(req: Request) {
  if (!req.headers.get("authorization")) return { error: "missing token" as const };
  const user = await getAuthUser(req);
  if (!user) return { error: "invalid token" as const };
  return { user };
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });
  const [profile] = await db.select().from(founderProfiles).where(eq(founderProfiles.userId, auth.user.id));
  return NextResponse.json({ profile: profile ?? null });
}

// Create or update. Returns field-keyed errors so the client can highlight
// the exact field (same pattern as the team-member form — B-048).
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const linkedin = String(body.linkedin ?? "").trim();
  const residentialAddress = String(body.residentialAddress ?? "").trim();

  const fields: Record<string, string> = {};
  if (!fullName) fields.fullName = "Your full name is required.";
  if (!phone) fields.phone = "Your phone number is required.";
  if (!linkedin) fields.linkedin = "Your LinkedIn profile is required.";
  else if (!isLinkedinUrl(linkedin)) fields.linkedin = "Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-name).";
  // Mandatory since 2026-07-18 — the utility bill in identity verification
  // proves this address.
  if (!residentialAddress) fields.residentialAddress = "Your residential address is required.";
  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Some required details are missing.", fields }, { status: 400 });
  }

  const values = {
    email: auth.user.email ?? null,
    fullName,
    phone,
    linkedin,
    residentialAddress,
  };
  const [profile] = await db
    .insert(founderProfiles)
    .values({ userId: auth.user.id, ...values })
    .onConflictDoUpdate({ target: founderProfiles.userId, set: { ...values, updatedAt: new Date() } })
    .returning();

  await recordAudit({
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: "founder.profile_saved",
    targetType: "founder",
    targetId: auth.user.id,
  });
  return NextResponse.json({ profile });
}
