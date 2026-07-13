import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contributions, deals, investorCohorts } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";
import { sendEmail, fundsConfirmedEmail } from "@/lib/email";
import { naira, unitsLabel } from "@/lib/money";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

// Admin confirms (paid -> confirmed) or cancels a contribution.
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: contributions.id,
      userId: contributions.userId,
      status: contributions.status,
      amount: contributions.amount,
      currency: contributions.currency,
      investorEmail: contributions.investorEmail,
      startupName: deals.startupName,
      cohortName: investorCohorts.name,
    })
    .from(contributions)
    .leftJoin(deals, eq(deals.id, contributions.dealId))
    .leftJoin(investorCohorts, eq(investorCohorts.id, contributions.investorCohortId))
    .where(eq(contributions.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Confirm only a reported payment; cancel anything not already confirmed.
  if (action === "confirm" && row.status !== "paid") {
    return NextResponse.json({ error: "Only a reported (paid) contribution can be confirmed." }, { status: 400 });
  }
  if (action === "cancel" && row.status === "confirmed") {
    return NextResponse.json({ error: "A confirmed contribution can't be cancelled here." }, { status: 400 });
  }

  const status = action === "confirm" ? "confirmed" : "cancelled";
  const [updated] = await db
    .update(contributions)
    .set({ status, updatedAt: new Date() })
    .where(eq(contributions.id, id))
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `contribution.${status}`,
    targetType: "contribution",
    targetId: id,
    metadata: { reference: updated.reference },
  });

  // Tell the investor their funds are confirmed (no-ops if email unconfigured).
  if (action === "confirm" && row.investorEmail) {
    const mail = fundsConfirmedEmail(row.cohortName ?? row.startupName ?? "your cohort", `${naira(row.amount)} (${unitsLabel(row.amount)})`);
    await sendEmail({ to: row.investorEmail, ...mail });
  }

  if (action === "confirm") {
    await notify({
      userId: row.userId,
      type: "contribution.confirmed",
      title: "Contribution confirmed",
      body: `Your ${naira(row.amount)} (${unitsLabel(row.amount)}) contribution to ${row.cohortName ?? "your cohort"} is confirmed.`,
      href: "/contribute",
    });
  }

  return NextResponse.json({ contribution: updated });
}
