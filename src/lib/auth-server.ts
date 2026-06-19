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
