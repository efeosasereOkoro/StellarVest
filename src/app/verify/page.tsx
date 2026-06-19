"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Verify your email</h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter the code we emailed you to finish setting up your account.
      </p>

      <form onSubmit={onVerify} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input
            type="email" value={email} required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Verification code</span>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code"
            value={otp} required
            onChange={(e) => setOtp(e.target.value.trim())}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest outline-none focus:border-gray-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {resent && <p className="text-sm text-green-700">A new code is on its way.</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <button onClick={onResend} className="font-medium text-gray-900 underline">
          Resend code
        </button>
        <Link href="/login" className="font-medium text-gray-900 underline">Back to sign in</Link>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</main>}>
      <VerifyInner />
    </Suspense>
  );
}
