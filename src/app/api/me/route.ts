import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userAccounts } from "@/db/schema";
import { getAuthUser, isAdminEmail } from "@/lib/auth-server";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [account] = await db.select({ role: userAccounts.role }).from(userAccounts).where(eq(userAccounts.userId, user.id));
  return NextResponse.json({
    email: user.email ?? null,
    isAdmin: isAdminEmail(user.email),
    role: account?.role ?? null,
  });
}
