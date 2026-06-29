import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, startups } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db.select().from(deals).orderBy(desc(deals.createdAt));
  // Approved startups feed the "create deal" dropdown (single source of truth).
  const approvedStartups = await db
    .select({ id: startups.id, name: startups.name, description: startups.description })
    .from(startups)
    .where(eq(startups.status, "approved"))
    .orderBy(desc(startups.updatedAt));

  return NextResponse.json({ deals: rows, approvedStartups });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const startupId = String(body.startupId ?? "");
  if (!startupId) return NextResponse.json({ error: "Select an approved startup." }, { status: 400 });

  // The deal is created from an approved startup; its name/description come from
  // the startup profile (admin can override the description).
  const [startup] = await db
    .select({ id: startups.id, name: startups.name, description: startups.description, status: startups.status })
    .from(startups)
    .where(eq(startups.id, startupId));
  if (!startup || startup.status !== "approved") {
    return NextResponse.json({ error: "That startup isn't approved." }, { status: 400 });
  }

  const description = String(body.description ?? "").trim() || startup.description || null;
  const valuation = String(body.valuation ?? "").trim() || null;
  const terms = String(body.terms ?? "").trim() || null;
  const goalNum = Number(body.fundingGoal);
  const fundingGoal = Number.isFinite(goalNum) && goalNum > 0 ? goalNum.toFixed(2) : null;

  const [deal] = await db
    .insert(deals)
    .values({ startupId, startupName: startup.name, description, fundingGoal, valuation, terms })
    .returning();

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "deal.created",
    targetType: "deal",
    targetId: deal.id,
    metadata: { startupName: startup.name, startupId },
  });

  return NextResponse.json({ deal });
}
