"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const linkError = params.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidLink = !token || !!linkError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Couldn't reset the password — the link may have expired.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>

        {invalidLink ? (
          <>
            <p className="mt-2 text-sm text-danger">
              This reset link is invalid or has expired.
            </p>
            <p className="mt-4 text-sm text-cosmic/60">
              <Link href="/forgot-password" className="font-medium text-cosmic underline">
                Request a new link
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="New password" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} />
            <Field label="Confirm new password" type="password" value={confirm} required onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving…" : "Set new password"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>}>
      <ResetInner />
    </Suspense>
  );
}
