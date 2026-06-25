// Transactional email via Brevo's HTTP API.
//
// Configured by env (set in Vercel + .env.local — never commit the key):
//   BREVO_API_KEY    the Brevo API key
//   EMAIL_FROM       a Brevo-verified sender address (e.g. support@starsector8.org)
//   EMAIL_FROM_NAME  display name (defaults to "StellarVest")
//
// Like recordAudit, this NEVER throws and silently no-ops when unconfigured, so
// a mail failure can never break the user-facing action that triggered it.

type SendArgs = { to: string; subject: string; html: string };

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !to) return false; // unconfigured or no recipient — skip

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME || "StellarVest" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Shared layout -------------------------------------------------------

// Link target for emails. Prefer an explicit override, then Vercel's stable
// production domain (set automatically on every deployment), then localhost.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

function layout(heading: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1b1b1b;line-height:1.6">
    <div style="padding:20px 0;font-weight:700;font-size:18px;color:#1b1b1b">StellarVest</div>
    <div style="border:1px solid #e6e6e6;border-radius:12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6b6b6b;margin-top:16px">
      StellarVest is in alpha. Questions? <a href="mailto:support@starsector8.org" style="color:#c2410c">support@starsector8.org</a>
    </p>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1b1b1b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${label}</a>`;
}

// --- Templates -----------------------------------------------------------

export function kycVerifiedEmail(): { subject: string; html: string } {
  return {
    subject: "You're verified — start investing on StellarVest",
    html: layout(
      "Your identity is verified ✅",
      `<p>Good news — your identity has been verified. You can now browse investment opportunities and back deals.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/deals`, "Browse deals")}</p>`,
    ),
  };
}

export function kycRejectedEmail(reason: string): { subject: string; html: string } {
  return {
    subject: "Action needed on your StellarVest verification",
    html: layout(
      "We couldn't verify your documents",
      `<p>Unfortunately your verification didn't pass. Here's why:</p>
       <p style="background:#f6f6f6;border-radius:8px;padding:12px 14px;margin:12px 0"><strong>${escapeHtml(reason)}</strong></p>
       <p>You can re-upload your documents any time — there's no limit on resubmissions.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/profile`, "Review & re-upload")}</p>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
