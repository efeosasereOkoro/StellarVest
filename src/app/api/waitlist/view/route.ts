import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { waitlistSignups } from "@/db/schema";

// Password-gated waitlist view for the PM (B-078). Deliberately NOT behind the
// admin auth allowlist: anyone with the shared password can read the list.
// The password is checked server-side (never sent to the browser) and read from
// WAITLIST_PASSWORD, defaulting to "123456" so it works out of the box. Set a
// stronger WAITLIST_PASSWORD in Vercel + .env.local to harden it.
//
// Note: this exposes names and emails (personal data) behind a single shared
// password. Fine for a small pre-launch list; revisit before the list grows.
const PASSWORD = process.env.WAITLIST_PASSWORD || "123456";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (String(body.password ?? "") !== PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const rows = await db
    .select({
      id: waitlistSignups.id,
      fullName: waitlistSignups.fullName,
      email: waitlistSignups.email,
      interest: waitlistSignups.interest,
      location: waitlistSignups.location,
      whatsapp: waitlistSignups.whatsapp,
      createdAt: waitlistSignups.createdAt,
    })
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));

  return NextResponse.json({ waitlist: rows, total: rows.length });
}
