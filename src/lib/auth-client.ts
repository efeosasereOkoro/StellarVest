"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Neon Auth hosts the Better Auth server for us; the client just points at it.
// Neon uses code-based email verification, so we enable the email-OTP plugin.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_NEON_AUTH_URL,
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

// Get a short-lived JWT for the current session, to authenticate our own API routes.
// Neon Auth (Better Auth) returns it in the `set-auth-jwt` response header on getSession.
export async function getToken(): Promise<string | null> {
  try {
    let jwt: string | null = null;
    await authClient.getSession({
      fetchOptions: {
        onSuccess: (ctx) => {
          jwt = ctx.response.headers.get("set-auth-jwt");
        },
      },
    });
    return jwt;
  } catch {
    // Network/auth hiccup (e.g. mid-deploy) — callers handle a null token.
    return null;
  }
}
