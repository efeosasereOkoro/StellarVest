import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, contributions } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";
import { getAdminEmails } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, newPledgeEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

function parseAmount(body: Record<string, unknown>): number | null {
  const amount = Number(body.amount);
  return Number.isFinite(amount) && amount >= 1 ? amount : null;
}

// A verified investor pledges an amount to a published deal. Re-pledging is
// allowed if a previous contribution to this deal was cancelled.
export async function POST(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const amount = parseAmount(body);
  if (amount === null) return NextResponse.json({ error: "Enter an amount of at least $1." }, { status: 400 });

  const [deal] = await db
    .select({ status: deals.status, startupName: deals.startupName })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.status, "published")));
  if (!deal) return NextResponse.json({ error: "This deal isn't open for contributions." }, { status: 404 });

  const [existing] = await db
    .select({ id: contributions.id, status: contributions.status })
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));
  if (existing && existing.status !== "cancelled") {
    return NextResponse.json({ error: "You've already pledged to this deal." }, { status: 400 });
  }

  const reference = `SV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const values = {
    amount: amount.toFixed(2),
    reference,
    status: "pledged" as const,
    paidAt: null,
    investorEmail: investor.email,
    updatedAt: new Date(),
  };
  // Reuse the row if re-pledging over a cancelled one (keeps history in audit).
  const [contribution] = existing
    ? await db.update(contributions).set(values).where(eq(contributions.id, existing.id)).returning()
    : await db.insert(contributions).values({ dealId: id, userId: investor.id, ...values }).returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.pledged",
    targetType: "deal",
    targetId: id,
    metadata: { amount: amount.toFixed(2), reference },
  });

  // Notify admins of the new pledge (no-ops if email unconfigured).
  const amountLabel = `$${amount.toFixed(2)}`;
  const mail = newPledgeEmail(deal.startupName, investor.email ?? "an investor", amountLabel, reference);
  await Promise.all(getAdminEmails().map((to) => sendEmail({ to, ...mail })));

  return NextResponse.json({ contribution });
}

// Edit the pledged amount — only before payment is reported.
export async function PATCH(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const amount = parseAmount(body);
  if (amount === null) return NextResponse.json({ error: "Enter an amount of at least $1." }, { status: 400 });

  const [existing] = await db
    .select({ id: contributions.id, status: contributions.status })
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));
  if (!existing) return NextResponse.json({ error: "No pledge found for this deal." }, { status: 404 });
  if (existing.status !== "pledged") {
    return NextResponse.json({ error: "You can only change the amount before reporting payment." }, { status: 400 });
  }

  const [updated] = await db
    .update(contributions)
    .set({ amount: amount.toFixed(2), updatedAt: new Date() })
    .where(eq(contributions.id, existing.id))
    .returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.amount_changed",
    targetType: "deal",
    targetId: id,
    metadata: { amount: amount.toFixed(2) },
  });

  return NextResponse.json({ contribution: updated });
}

// Cancel a pledge — only before payment is reported. After that, an admin
// handles cancellation (funds may be in transit).
export async function DELETE(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const [existing] = await db
    .select({ id: contributions.id, status: contributions.status, reference: contributions.reference })
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));
  if (!existing) return NextResponse.json({ error: "No pledge found for this deal." }, { status: 404 });
  if (existing.status !== "pledged") {
    return NextResponse.json({ error: "You can only cancel before reporting payment — contact us if you've already paid." }, { status: 400 });
  }

  const [updated] = await db
    .update(contributions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(contributions.id, existing.id))
    .returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.cancelled",
    targetType: "deal",
    targetId: id,
    metadata: { reference: existing.reference },
  });

  return NextResponse.json({ contribution: updated });
}
