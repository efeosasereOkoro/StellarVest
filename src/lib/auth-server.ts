import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Neon Auth (Better Auth) signs JWTs with EdDSA; we verify them against its JWKS.
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const JWKS = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export type AuthUser = { id: string; email?: string };

/** Verify the Bearer token on a request and return the authenticated user, or null. */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  if (!JWKS) return null;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS);
    return payloadToUser(payload);
  } catch {
    return null;
  }
}

function payloadToUser(p: JWTPayload): AuthUser | null {
  if (!p.sub) return null;
  return { id: p.sub, email: typeof p.email === "string" ? p.email : undefined };
}

/** The admin allowlist (ADMIN_EMAILS), normalised. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Is this email on the admin allowlist (ADMIN_EMAILS)? */
export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** Verify the request and return the user only if they're an admin. */
export async function getAdminUser(req: Request): Promise<AuthUser | null> {
  const user = await getAuthUser(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
