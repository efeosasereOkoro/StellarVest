// Slack mirror for admin notifications (B-063, walkthrough-2 Q4). Posts to
// the StarSector8 admin channel via an incoming webhook. Committee events go
// here too for now (committee = admin — D-013).
//
// Setup: create an incoming webhook for the channel (Slack → Apps → Incoming
// Webhooks) and set SLACK_WEBHOOK_URL in .env.local and on Vercel. Unset →
// no-op. Delivery is best-effort: a Slack failure must never break the
// action that triggered it.

// Same link-base logic as email.ts: explicit override, then Vercel's stable
// production domain, then localhost.
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export async function slackAdmin(n: { title: string; body?: string; href?: string }): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  const link = `${APP_URL}${n.href ?? ""}`;
  const text = `*${n.title}*${n.body ? `\n${n.body}` : ""}\n<${link}|Open in StelarVest →>`;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* best-effort */
  }
}
