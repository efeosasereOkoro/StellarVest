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
