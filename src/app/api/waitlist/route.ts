import { NextResponse } from "next/server";
import { db } from "@/db";
import { waitlistSignups } from "@/db/schema";
import { sendEmail, waitlistConfirmationEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";

// Public pre-launch waitlist (B-077). No auth: anyone can join. One row per
// email; a repeat email is treated as a friendly "already on the list".
const INTERESTS = ["investor", "founder", "both"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const interest = String(body.interest ?? "").trim();

  const fields: Record<string, string> = {};
  if (!fullName) fields.fullName = "Your name is required.";
  if (!email) fields.email = "Your email is required.";
  else if (!EMAIL_RE.test(email) || email.length > 320) fields.email = "Enter a valid email address.";
  if (!INTERESTS.includes(interest)) fields.interest = "Choose what you're interested in.";
  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields }, { status: 400 });
  }

  // Insert, or no-op if the email is already on the list.
  const inserted = await db
    .insert(waitlistSignups)
    .values({ fullName, email, interest })
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
    body: `${fullName} (${email}) joined the waitlist as: ${interest}.`,
    href: "/admin/waitlist",
  });

  return NextResponse.json({ ok: true });
}
