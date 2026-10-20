"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  INTERESTS,
  INVESTOR_LOCATIONS,
  FOUNDER_LOCATIONS,
  type Interest,
} from "@/lib/waitlist-options";

// Investor binary, shown with friendly "I live..." labels.
const INVESTOR_LOCATION_LABELS: Record<string, string> = {
  Nigeria: "I live in Nigeria",
  "Outside Nigeria": "I live outside Nigeria",
};

export default function WaitlistPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // Nothing preselected on load (#114).
  const [interest, setInterest] = useState<Interest | null>(null);
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"new" | "already" | null>(null);

  function pickInterest(value: Interest) {
    setInterest(value);
    setLocation(""); // the valid set differs per interest, so start fresh
    setErrors((p) => ({ ...p, interest: "", location: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Your name is required.";
    if (!email.trim()) errs.email = "Your email is required.";
    if (!interest) errs.interest = "Choose what you're interested in.";
    else if (!location) errs.location = "Please tell us where you're based.";
    if (!consent) errs.marketingConsent = "Please agree before joining.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, interest, location, whatsapp, marketingConsent: consent }),
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
            We&rsquo;ll email you at <span className="font-medium text-cosmic">{email}</span>{" "}
            when we open access. There&rsquo;s nothing else to do right now.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-cosmic underline">Back to home</Link>
        </Card>
      </main>
    );
  }

  const selectBase =
    "w-full rounded-lg border bg-pioneer px-3 py-2 text-sm text-cosmic outline-none transition-colors focus:ring-2";
  const selectState = errors.location
    ? "border-danger focus:border-danger focus:ring-danger/30"
    : "border-cosmic/15 focus:border-venture focus:ring-venture/30";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Join the waitlist</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        Stelvest is opening access soon. Leave your details and we&rsquo;ll email you when it&rsquo;s your turn.
      </p>

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" value={fullName} error={errors.fullName}
            onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: "" })); }} />
          <Field label="Email" type="email" value={email} error={errors.email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }} />

          {/* Interest — nothing selected on load (#114) */}
          <div>
            <span className="mb-1 block text-sm font-medium text-cosmic/80">I&rsquo;m interested in</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {INTERESTS.map((o) => {
                const active = interest === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pickInterest(o.value)}
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
            {interest && (
              <p className="mt-1 text-xs text-cosmic/50">{INTERESTS.find((o) => o.value === interest)?.hint}</p>
            )}
            {errors.interest && <p className="mt-1 text-sm text-danger">{errors.interest}</p>}
          </div>

          {/* Location — required, shape depends on interest (#111, #117).
              Investors and "both" get the binary; founders get the states dropdown. */}
          {(interest === "investor" || interest === "both") && (
            <div>
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Where will you be investing from?</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INVESTOR_LOCATIONS.map((v) => {
                  const active = location === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setLocation(v); setErrors((p) => ({ ...p, location: "" })); }}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                        active ? "border-cosmic bg-cosmic/[0.04] text-cosmic" : "border-cosmic/15 text-cosmic/80 hover:bg-cosmic/5"
                      }`}
                    >
                      {INVESTOR_LOCATION_LABELS[v]}
                    </button>
                  );
                })}
              </div>
              {errors.location && <p className="mt-1 text-sm text-danger">{errors.location}</p>}
            </div>
          )}

          {interest === "founder" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Where is your startup based?</span>
              <select
                value={location}
                onChange={(e) => { setLocation(e.target.value); setErrors((p) => ({ ...p, location: "" })); }}
                aria-invalid={errors.location ? true : undefined}
                className={`${selectBase} ${selectState}`}
              >
                <option value="" disabled>Select a location</option>
                {FOUNDER_LOCATIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {errors.location && <p className="mt-1 text-sm text-danger">{errors.location}</p>}
            </label>
          )}

          {/* Optional WhatsApp (#112) */}
          <Field
            label="WhatsApp number (optional)"
            type="tel"
            placeholder="e.g. +234 801 234 5678"
            value={whatsapp}
            error={errors.whatsapp}
            onChange={(e) => { setWhatsapp(e.target.value); setErrors((p) => ({ ...p, whatsapp: "" })); }}
          />

          {/* Consent — unticked by default, required (#113) */}
          <div>
            <label className="flex items-start gap-2 text-sm text-cosmic/80">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => { setConsent(e.target.checked); setErrors((p) => ({ ...p, marketingConsent: "" })); }}
                aria-invalid={errors.marketingConsent ? true : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-cosmic/30 text-cosmic focus:ring-venture/30"
              />
              <span>
                I agree to Stelvest emailing me about early access and I have read the{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-cosmic underline">privacy notice</a>.
              </span>
            </label>
            {errors.marketingConsent && <p className="mt-1 text-sm text-danger">{errors.marketingConsent}</p>}
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
