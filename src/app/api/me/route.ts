import { NextResponse } from "next/server";
import { getAuthUser, isAdminEmail } from "@/lib/auth-server";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ email: user.email ?? null, isAdmin: isAdminEmail(user.email) });
}
