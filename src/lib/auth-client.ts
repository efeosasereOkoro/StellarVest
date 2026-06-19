"use client";

import { createAuthClient } from "better-auth/react";

// Neon Auth hosts the Better Auth server for us; the client just points at it.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_NEON_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
