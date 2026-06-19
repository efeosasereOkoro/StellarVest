"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Sign in to StellarVest</h1>
      <p className="mt-1 text-sm text-gray-500">Welcome back</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input
            type="email" value={email} required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
          <input
            type="password" value={password} required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {needsVerify && (
          <Link
            href={`/verify?email=${encodeURIComponent(email)}`}
            className="block text-sm font-medium text-gray-900 underline"
          >
            Enter your verification code →
          </Link>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-gray-900 underline">Create an account</Link>
      </p>
    </main>
  );
}
