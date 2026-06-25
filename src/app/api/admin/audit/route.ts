import { NextResponse } from "next/server";
import { and, desc, gte, ilike, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getAdminUser } from "@/lib/auth-server";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const actor = params.get("actor")?.trim();
  const action = params.get("action")?.trim();
  const from = params.get("from"); // YYYY-MM-DD
  const to = params.get("to"); // YYYY-MM-DD

  const conds = [];
  if (actor) conds.push(ilike(auditLog.actorEmail, `%${actor}%`));
  if (action) conds.push(ilike(auditLog.action, `%${action}%`));
  if (from) conds.push(gte(auditLog.createdAt, new Date(`${from}T00:00:00.000Z`)));
  if (to) conds.push(lte(auditLog.createdAt, new Date(`${to}T23:59:59.999Z`)));
  const where = conds.length ? and(...conds) : undefined;

  const base = db.select().from(auditLog);
  const entries = await (where ? base.where(where) : base).orderBy(desc(auditLog.createdAt)).limit(200);

  return NextResponse.json({ entries });
}
