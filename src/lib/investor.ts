import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investorProfiles } from "@/db/schema";
import { getAuthUser, type AuthUser } from "@/lib/auth-server";

/**
 * Verify the request and return the user only if they're a KYC-verified
 * investor. Used to gate the investor-facing deal browsing / contributions.
 */
export async function getVerifiedInvestor(req: Request): Promise<AuthUser | null> {
  const user = await getAuthUser(req);
  if (!user) return null;
  const [prof] = await db
    .select({ kycStatus: investorProfiles.kycStatus })
    .from(investorProfiles)
    .where(eq(investorProfiles.userId, user.id));
  if (prof?.kycStatus !== "verified") return null;
  return user;
}
