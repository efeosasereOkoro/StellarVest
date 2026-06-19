"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerify(false);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      const unverified =
        error.code === "EMAIL_NOT_VERIFIED" ||
        (error.message ?? "").toLowerCase().includes("not verified");
      if (unverified) {
        setNeedsVerify(true);
        setError("Your email isn't verified yet.");
      } else {
        setError(error.message ?? "Sign-in failed. Check your email and password.");
      }
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold">Sign in to StellarVest</h1>
        <p className="mt-1 text-sm text-cosmic/60">Welcome back</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-cosmic/60 underline">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {needsVerify && (
            <Link
              href={`/verify?email=${encodeURIComponent(email)}`}
              className="block text-sm font-medium text-ignition underline"
            >
              Enter your verification code →
            </Link>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-cosmic/60">
          New here?{" "}
          <Link href="/signup" className="font-medium text-cosmic underline">Create an account</Link>
        </p>
      </Card>
    </main>
  );
}
