import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, contributions } from "@/db/schema";
import { getVerifiedInvestor } from "@/lib/investor";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// A verified investor pledges an amount to a published deal.
export async function POST(req: Request, { params }: Ctx) {
  const investor = await getVerifiedInvestor(req);
  if (!investor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Enter an amount of at least $1." }, { status: 400 });
  }

  const [deal] = await db
    .select({ status: deals.status })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.status, "published")));
  if (!deal) return NextResponse.json({ error: "This deal isn't open for contributions." }, { status: 404 });

  const [existing] = await db
    .select({ id: contributions.id })
    .from(contributions)
    .where(and(eq(contributions.dealId, id), eq(contributions.userId, investor.id)));
  if (existing) {
    return NextResponse.json({ error: "You've already pledged to this deal." }, { status: 400 });
  }

  const reference = `SV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const [contribution] = await db
    .insert(contributions)
    .values({
      dealId: id,
      userId: investor.id,
      investorEmail: investor.email,
      amount: amount.toFixed(2),
      reference,
    })
    .returning();

  await recordAudit({
    actorId: investor.id,
    actorEmail: investor.email,
    action: "contribution.pledged",
    targetType: "deal",
    targetId: id,
    metadata: { amount: amount.toFixed(2), reference },
  });

  return NextResponse.json({ contribution });
}
