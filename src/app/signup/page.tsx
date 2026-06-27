"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";

const ROLES = [
  { value: "investor", label: "I'm an investor", hint: "Back startups through managed cohorts." },
  { value: "founder", label: "I'm a founder", hint: "Raise capital for your startup." },
] as const;

export default function SignUpPage() {
  const router = useRouter();
  const [role, setRole] = useState<"investor" | "founder">("investor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Sign-up failed. Please try again.");
      return;
    }
    // Carry the chosen role through verification so we can persist + route it.
    router.push(`/verify?email=${encodeURIComponent(email)}&role=${role}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-cosmic/60">Tell us how you&rsquo;ll use StellarVest.</p>

        <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r.value)}
                className={`rounded-xl border p-3 text-left transition-colors ${active ? "border-cosmic bg-cosmic/[0.04]" : "border-cosmic/15 hover:bg-cosmic/5"}`}
              >
                <span className={`block text-sm font-semibold ${active ? "text-cosmic" : "text-cosmic/80"}`}>{r.label}</span>
                <span className="mt-0.5 block text-xs text-cosmic/60">{r.hint}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Full name" type="text" value={name} required onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Field label="Password" type="password" value={password} required minLength={8} onChange={(e) => setPassword(e.target.value)} aria-describedby="pw-hint" />
            <p id="pw-hint" className="mt-1 text-xs text-cosmic/60">{PASSWORD_HINT}</p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-xs text-cosmic/70">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-cosmic">Terms</Link> and{" "}
            <Link href="/privacy" className="underline hover:text-cosmic">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-6 text-sm text-cosmic/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-cosmic underline">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
