"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INTERESTS = [
  { value: "investor", label: "Investing", hint: "Back startups through managed cohorts." },
  { value: "founder", label: "Raising capital", hint: "List your startup for investment." },
  { value: "both", label: "Both", hint: "Investing and raising." },
] as const;

export default function WaitlistPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<"investor" | "founder" | "both">("investor");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"new" | "already" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Your name is required.";
    if (!email.trim()) errs.email = "Your email is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, interest }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(data.fields ?? {});
      return;
    }
    setDone(data.alreadyJoined ? "already" : "new");
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-venture/30 text-deep-frontier">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-11" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-cosmic">
            {done === "already" ? "You're already on the list" : "You're on the list"}
          </h1>
          <p className="mt-2 text-sm text-cosmic/70">
            We&rsquo;ll email you at <span className="font-medium text-cosmic">{email}</span> when we open access. There&rsquo;s nothing else to do right now.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-cosmic underline">Back to home</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Join the waitlist</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        Stelvest is opening access soon. Leave your details and we&rsquo;ll email you when it&rsquo;s your turn.
      </p>

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full name" value={fullName} error={errors.fullName}
            onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: "" })); }} />
          <Field label="Email" type="email" value={email} error={errors.email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }} />

          <div>
            <span className="mb-1 block text-sm font-medium text-cosmic/80">I&rsquo;m interested in</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {INTERESTS.map((o) => {
                const active = interest === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setInterest(o.value)}
                    aria-pressed={active}
                    className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                      active ? "border-cosmic bg-cosmic/[0.04] text-cosmic" : "border-cosmic/15 text-cosmic/80 hover:bg-cosmic/5"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-cosmic/50">{INTERESTS.find((o) => o.value === interest)?.hint}</p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Joining…" : "Join the waitlist"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-cosmic/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-cosmic underline">Sign in</Link>
      </p>
    </main>
  );
}
