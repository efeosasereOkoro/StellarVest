"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Cta = { label: string; href: string } | null;
type ContributionSummary = { confirmed: Record<string, number>; pending: Record<string, number> };

// Format a money amount in its currency; fall back to "CUR n" if the code isn't
// a valid ISO currency (defensive — the MVP records USD).
function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

const KYC: Record<
  string,
  { tone: "venture" | "pitch" | "ignition" | "neutral"; title: string; body: string; cta: Cta }
> = {
  registered: {
    tone: "neutral",
    title: "Complete your profile",
    body: "Add your details and upload your ID to get verified and start investing.",
    cta: { label: "Complete profile", href: "/profile" },
  },
  submitted: {
    tone: "pitch",
    title: "Verification in progress",
    body: "Your documents are under review. Your status updates here once it's done — no need to do anything.",
    cta: { label: "View profile", href: "/profile" },
  },
  // Verified has no CTA — the contributions card below is the single place to
  // contribute & track (B-072), so the status card only reports status.
  verified: {
    tone: "venture",
    title: "You're verified",
    body: "Your account is verified — you're ready to invest.",
    cta: null,
  },
  rejected: {
    tone: "ignition",
    title: "Action needed",
    body: "Your verification didn't pass. See the reason on your profile and re-upload your documents.",
    cta: { label: "Review & re-upload", href: "/profile" },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [kyc, setKyc] = useState("registered");
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<ContributionSummary | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [kycRes, meRes, sumRes] = await Promise.all([
          fetch("/api/kyc", { headers }),
          fetch("/api/me", { headers }),
          fetch("/api/contributions/summary", { headers }),
        ]);
        if (kycRes.ok) setKyc((await kycRes.json().catch(() => ({}))).kycStatus ?? "registered");
        if (meRes.ok) setRole((await meRes.json().catch(() => ({}))).role ?? null);
        if (sumRes.ok) setSummary(await sumRes.json().catch(() => null));
      } finally {
        setLoaded(true);
      }
    })();
  }, [isPending, session, router]);

  if (isPending || !session || !loaded) {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  const s = KYC[kyc] ?? KYC.registered;
  const confirmedEntries = summary ? Object.entries(summary.confirmed) : [];
  const pendingEntries = summary ? Object.entries(summary.pending) : [];
  const hasContributions = confirmedEntries.length > 0 || pendingEntries.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      {role === "founder" && (
        <Card className="mt-6 border-venture/40 bg-frontier/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cosmic">You&rsquo;re set up as a founder</p>
              <p className="mt-1 text-sm text-cosmic/70">Manage your startup profile, documents, and updates.</p>
            </div>
            <Link href="/founder" className="inline-flex w-full items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90 sm:w-auto">
              My startup
            </Link>
          </div>
        </Card>
      )}

      {role !== "founder" && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-cosmic">{s.title}</p>
                <Badge tone={s.tone}>{kyc}</Badge>
              </div>
              <p className="mt-1 text-sm text-cosmic/70">{s.body}</p>
            </div>
            {s.cta && (
              <Link
                href={s.cta.href}
                className="inline-flex w-full items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90 sm:w-auto"
              >
                {s.cta.label}
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* The single contribute-and-track section (B-072) — status card above
          carries no CTA and the nav grid below links elsewhere only. */}
      {role !== "founder" && kyc === "verified" && (
        <Card className="mt-4 border-venture/40 bg-frontier/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-cosmic/60">Your contributions</p>
              {hasContributions ? (
                <>
                  <p className="mt-1 font-display text-3xl font-semibold text-cosmic">
                    {confirmedEntries.length
                      ? confirmedEntries.map(([c, n]) => money(c, n)).join(" · ")
                      : money(pendingEntries[0][0], 0)}
                  </p>
                  {pendingEntries.length > 0 && (
                    <p className="mt-1 text-sm text-cosmic/70">
                      + {pendingEntries.map(([c, n]) => money(c, n)).join(" · ")} pending confirmation
                    </p>
                  )}
                  <p className="mt-1 text-xs text-cosmic/50">Confirmed across all your contributions.</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-cosmic/70">
                  You haven&rsquo;t contributed yet. Add to your cohort&rsquo;s pool to start investing.
                </p>
              )}
            </div>
            <Link
              href="/contribute"
              className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90 sm:w-auto"
            >
              Contribute &amp; track
            </Link>
          </div>
        </Card>
      )}

      {role !== "founder" && kyc === "verified" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/portfolio" className="block">
            <Card className="h-full transition-colors hover:border-cosmic/25">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-venture/40 text-deep-frontier">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" />
                </svg>
              </span>
              <p className="mt-3 font-medium text-cosmic">Your portfolio</p>
              <p className="mt-0.5 text-sm text-cosmic/70">See the portfolios your cohort invests in and the startups inside.</p>
            </Card>
          </Link>
          <Link href="/updates" className="block">
            <Card className="h-full transition-colors hover:border-cosmic/25">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-pitch text-deep-pitch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
              </span>
              <p className="mt-3 font-medium text-cosmic">Portfolio updates</p>
              <p className="mt-0.5 text-sm text-cosmic/70">Latest news from startups you&rsquo;ve backed.</p>
            </Card>
          </Link>
        </div>
      )}
    </main>
  );
}
