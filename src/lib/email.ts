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
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

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

export function fundsConfirmedEmail(dealName: string, amountLabel: string): { subject: string; html: string } {
  return {
    subject: `Your contribution to ${dealName} is confirmed`,
    html: layout(
      "Funds confirmed ✅",
      `<p>We&rsquo;ve confirmed receipt of your <strong>${escapeHtml(amountLabel)}</strong> contribution to <strong>${escapeHtml(dealName)}</strong>. Thank you for investing.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/portfolio`, "View your contributions")}</p>`,
    ),
  };
}

export function newPledgeEmail(dealName: string, investorEmail: string, amountLabel: string, reference: string): { subject: string; html: string } {
  return {
    subject: `New pledge: ${amountLabel} to ${dealName}`,
    html: layout(
      "New contribution pledged",
      `<p><strong>${escapeHtml(investorEmail)}</strong> pledged <strong>${escapeHtml(amountLabel)}</strong> to <strong>${escapeHtml(dealName)}</strong>.</p>
       <p>Reference: <strong>${escapeHtml(reference)}</strong>. You&rsquo;ll be able to confirm the funds once the transfer is received.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/admin/contributions`, "Review contributions")}</p>`,
    ),
  };
}

export function dealNeedsReviewEmail(dealName: string, dealId: string): { subject: string; html: string } {
  return {
    subject: `Committee review needed: ${dealName}`,
    html: layout(
      "A deal needs your review",
      `<p><strong>${escapeHtml(dealName)}</strong> has been sent to the investment committee and is awaiting recommendations.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/admin/deals/${dealId}`, "Open the deal")}</p>`,
    ),
  };
}

export function kycReceivedEmail(): { subject: string; html: string } {
  return {
    subject: "We've received your verification documents",
    html: layout(
      "Documents received",
      `<p>Thanks — we&rsquo;ve received your identity documents and they&rsquo;re now in review. We&rsquo;ll email you as soon as your verification is complete.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/dashboard`, "Go to your dashboard")}</p>`,
    ),
  };
}

export function pledgeReceiptEmail(dealName: string, dealId: string, amountLabel: string, reference: string): { subject: string; html: string } {
  return {
    subject: `Your pledge to ${dealName} — next steps`,
    html: layout(
      "Pledge recorded",
      `<p>We&rsquo;ve recorded your pledge of <strong>${escapeHtml(amountLabel)}</strong> to <strong>${escapeHtml(dealName)}</strong>.</p>
       <p>To complete it, transfer the funds to the StarSector8 escrow account quoting your reference <strong>${escapeHtml(reference)}</strong>, then mark the payment as sent on the deal page.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/deals/${dealId}`, "View the deal")}</p>`,
    ),
  };
}

// --- Cohort contributions (B1) ---

export function newContributionEmail(cohortName: string, investorEmail: string, amountLabel: string, reference: string): { subject: string; html: string } {
  return {
    subject: `New contribution: ${amountLabel} to ${cohortName}`,
    html: layout(
      "New contribution pledged",
      `<p><strong>${escapeHtml(investorEmail)}</strong> pledged <strong>${escapeHtml(amountLabel)}</strong> to the <strong>${escapeHtml(cohortName)}</strong> cohort.</p>
       <p>Reference: <strong>${escapeHtml(reference)}</strong>. You&rsquo;ll be able to confirm the funds once the transfer is received.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/admin/contributions`, "Review contributions")}</p>`,
    ),
  };
}

export function contributionReceiptEmail(cohortName: string, amountLabel: string, reference: string): { subject: string; html: string } {
  return {
    subject: `Your contribution to ${cohortName} — next steps`,
    html: layout(
      "Contribution recorded",
      `<p>We&rsquo;ve recorded your contribution of <strong>${escapeHtml(amountLabel)}</strong> to the <strong>${escapeHtml(cohortName)}</strong> cohort.</p>
       <p>To complete it, transfer the funds to the StarSector8 escrow account quoting your reference <strong>${escapeHtml(reference)}</strong>, then mark the payment as sent.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/contribute`, "View your contributions")}</p>`,
    ),
  };
}

export function dealPublishedEmail(dealName: string, dealId: string): { subject: string; html: string } {
  return {
    subject: `New investment opportunity: ${dealName}`,
    html: layout(
      "A new deal is open",
      `<p><strong>${escapeHtml(dealName)}</strong> is now open for contributions on StellarVest.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/deals/${dealId}`, "View the deal")}</p>`,
    ),
  };
}

export function startupSubmittedEmail(startupName: string): { subject: string; html: string } {
  return {
    subject: `Startup submitted for review: ${startupName}`,
    html: layout(
      "A startup needs review",
      `<p><strong>${escapeHtml(startupName)}</strong> has been submitted by its founder and is awaiting your review.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/admin/startups`, "Review submissions")}</p>`,
    ),
  };
}

export function startupApprovedEmail(startupName: string): { subject: string; html: string } {
  return {
    subject: `${startupName} is approved on StellarVest`,
    html: layout(
      "Your startup is approved ✅",
      `<p>Good news — <strong>${escapeHtml(startupName)}</strong> has been approved. You can now post updates to investors from your founder dashboard.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/founder`, "Go to your dashboard")}</p>`,
    ),
  };
}

export function startupRejectedEmail(startupName: string, reason: string): { subject: string; html: string } {
  return {
    subject: `Action needed on ${startupName}`,
    html: layout(
      "We couldn't approve your submission yet",
      `<p>Your submission for <strong>${escapeHtml(startupName)}</strong> didn&rsquo;t pass review. Here&rsquo;s why:</p>
       <p style="background:#f6f6f6;border-radius:8px;padding:12px 14px;margin:12px 0"><strong>${escapeHtml(reason)}</strong></p>
       <p>You can update your details and documents and resubmit.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/founder`, "Update & resubmit")}</p>`,
    ),
  };
}

export function startupQueriedEmail(startupName: string, note: string): { subject: string; html: string } {
  return {
    subject: `A few questions on ${startupName}`,
    html: layout(
      "We have a few questions",
      `<p>Thanks for submitting <strong>${escapeHtml(startupName)}</strong>. Before we can approve it, the StarSector8 team has a query:</p>
       <p style="background:#f6f6f6;border-radius:8px;padding:12px 14px;margin:12px 0"><strong>${escapeHtml(note)}</strong></p>
       <p>Please update your details or documents and resubmit — no need to start over.</p>
       <p style="margin:20px 0">${button(`${APP_URL}/founder`, "Update & resubmit")}</p>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
