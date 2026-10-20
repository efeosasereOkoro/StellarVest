import { NextResponse } from "next/server";
import { db } from "@/db";
import { waitlistSignups } from "@/db/schema";
import { sendEmail, waitlistConfirmationEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";
import { INTERESTS, isValidLocation } from "@/lib/waitlist-options";

// Public pre-launch waitlist (B-077). No auth: anyone can join. One row per
// email; a repeat email is treated as a friendly "already on the list".
const INTEREST_VALUES = INTERESTS.map((i) => i.value);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const interest = String(body.interest ?? "").trim();
  const location = String(body.location ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const marketingConsent = body.marketingConsent === true;

  const fields: Record<string, string> = {};
  if (!fullName) fields.fullName = "Your name is required.";
  if (!email) fields.email = "Your email is required.";
  else if (!EMAIL_RE.test(email) || email.length > 320) fields.email = "Enter a valid email address.";
  if (!INTEREST_VALUES.includes(interest as (typeof INTEREST_VALUES)[number])) {
    fields.interest = "Choose what you're interested in.";
  } else if (!location) {
    fields.location = "Please tell us where you're based.";
  } else if (!isValidLocation(interest, location)) {
    fields.location = "Please choose a location from the list.";
  }
  if (whatsapp.length > 40) fields.whatsapp = "That number looks too long.";
  if (!marketingConsent) fields.marketingConsent = "Please agree before joining.";
  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields }, { status: 400 });
  }

  // Insert, or no-op if the email is already on the list.
  const inserted = await db
    .insert(waitlistSignups)
    .values({ fullName, email, interest, location, whatsapp: whatsapp || null, marketingConsent })
    .onConflictDoNothing({ target: waitlistSignups.email })
    .returning({ id: waitlistSignups.id });

  if (inserted.length === 0) {
    return NextResponse.json({ ok: true, alreadyJoined: true });
  }

  // Confirmation to the person; alert to the team (in-app + Slack).
  await sendEmail({ to: email, ...waitlistConfirmationEmail(fullName) });
  await notifyAdmins({
    type: "waitlist.joined",
    title: "New waitlist signup",
    body: `${fullName} (${email}) joined the waitlist as: ${interest}, based in ${location}.`,
    href: "/admin/waitlist",
  });

  return NextResponse.json({ ok: true });
}
