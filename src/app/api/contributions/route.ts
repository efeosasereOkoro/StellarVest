import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions, cohortMembers, investorCohorts, investorProfiles, platformSettings } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";
import { getAdminEmails } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, newContributionEmail, contributionReceiptEmail } from "@/lib/email";
import { naira, unitsLabel } from "@/lib/money";
import { minimumFor } from "@/lib/kyc";

// The investor's residency-based minimum contribution (naira).
async function minimumForUser(userId: string) {
  const [prof] = await db.select({ residency: investorProfiles.residency }).from(investorProfiles).where(eq(investorProfiles.userId, userId));
  return { residency: prof?.residency ?? null, minimum: minimumFor(prof?.residency) };
}

// The cohort a verified investor belongs to (first membership — MVP assumes one).
async function cohortFor(userId: string) {
  const [row] = await db
    .select({ id: cohortMembers.investorCohortId, name: investorCohorts.name })
    .from(cohortMembers)
    .innerJoin(investorCohorts, eq(investorCohorts.id, cohortMembers.investorCohortId))
    .where(eq(cohortMembers.userId, userId))
    .limit(1);
  return row ?? null;
}

// GET: the investor's cohort, their contribution ledger, escrow instructions,
// and running totals. cohort is null if they haven't been placed in one yet.
export async function GET(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cohort = await cohortFor(investor.id);

  const ledger = await db
    .select({
      id: contributions.id,
      amount: contributions.amount,
      currency: contributions.currency,
      reference: contributions.reference,
      status: contributions.status,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(eq(contributions.userId, investor.id))
    .orderBy(desc(contributions.createdAt));

  const confirmed = ledger.filter((c) => c.status === "confirmed").reduce((s, c) => s + Number(c.amount), 0);
  const pending = ledger.filter((c) => c.status === "pledged" || c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);

  const [settings] = await db
    .select({ escrowInstructions: platformSettings.escrowInstructions })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1));

  const { residency, minimum } = await minimumForUser(investor.id);

  return NextResponse.json({
    cohort,
    contributions: ledger,
    escrowInstructions: settings?.escrowInstructions ?? "",
    totals: { confirmed: confirmed.toFixed(2), pending: pending.toFixed(2) },
    residency,
    minimum,
  });
}

// POST: pledge a contribution to the investor's cohort pool. A ledger — an
// investor can contribute repeatedly (e.g. monthly).
export async function POST(req: Request) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cohort = await cohortFor(investor.id);
  if (!cohort) {
    return NextResponse.json({ error: "You'll be placed in a cohort by StarSector8 before you can contribute." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Enter an amount of at least 1." }, { status: 400 });
  }

  // Hard-enforced minimum by residency (B3).
  const { minimum } = await minimumForUser(investor.id);
  if (amount < minimum) {
    return NextResponse.json({ error: `The minimum contribution is ${naira(minimum)}.` }, { status: 400 });
  }

  const reference = `SV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const [contribution] = await db
    .insert(contributions)
    .values({
      investorCohortId: cohort.id,
      userId: investor.id,
      investorEmail: investor.email,
      amount: amount.toFixed(2),
      currency: "NGN",
      reference,
      status: "pledged",
    })
    .returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.pledged",
    targetType: "investor_cohort",
    targetId: cohort.id,
    metadata: { amount: amount.toFixed(2), reference },
  });

  const amountLabel = `${naira(amount)} (${unitsLabel(amount)})`;
  const adminMail = newContributionEmail(cohort.name, investor.email ?? "an investor", amountLabel, reference);
  await Promise.all([
    ...getAdminEmails().map((to) => sendEmail({ to, ...adminMail })),
    investor.email ? sendEmail({ to: investor.email, ...contributionReceiptEmail(cohort.name, amountLabel, reference) }) : Promise.resolve(false),
  ]);

  return NextResponse.json({ contribution });
}
