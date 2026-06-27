"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
    setLoading(false);
    if (error) {
      setError(error.message ?? "That code didn't work. Check it and try again.");
      return;
    }
    // Persist the role chosen at signup and route to the right home.
    const role = params.get("role");
    if (role === "investor" || role === "founder") {
      try {
        const token = await getToken();
        if (token) {
          await fetch("/api/account/role", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          });
        }
      } catch {
        // best-effort; the user can still use either path
      }
      router.push(role === "founder" ? "/founder" : "/dashboard");
      return;
    }
    router.push("/dashboard");
  }

  async function onResend() {
    setError(null);
    setResent(false);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    if (error) setError(error.message ?? "Could not resend the code.");
    else setResent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold">Verify your email</h1>
        <p className="mt-1 text-sm text-cosmic/60">
          Enter the code we emailed you to finish setting up your account.
        </p>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="Verification code"
            type="text" inputMode="numeric" autoComplete="one-time-code"
            value={otp} required
            className="tracking-widest"
            onChange={(e) => setOtp(e.target.value.trim())}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {resent && <p className="text-sm text-deep-frontier">A new code is on its way.</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Verifying…" : "Verify & continue"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-cosmic/60">
          <button onClick={onResend} className="font-medium text-cosmic underline">Resend code</button>
          <Link href="/login" className="font-medium text-cosmic underline">Back to sign in</Link>
        </div>
      </Card>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>}>
      <VerifyInner />
    </Suspense>
  );
}
