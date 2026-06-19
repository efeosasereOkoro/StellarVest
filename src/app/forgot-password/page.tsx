"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Couldn't send the reset email. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-cosmic/60">
          We&apos;ll email you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg bg-frontier p-4 text-sm text-deep-frontier">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on
            its way. Open it to choose a new password.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-sm text-cosmic/60">
          <Link href="/login" className="font-medium text-cosmic underline">Back to sign in</Link>
        </p>
      </Card>
    </main>
  );
}
