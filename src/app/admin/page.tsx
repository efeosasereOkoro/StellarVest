"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";

type Overview = {
  pendingKyc: number;
  verifiedInvestors: number;
  syndicateCount: number;
  cohortCount: number;
  publishedDeals: number;
  awaitingFunds: number;
  dealsUnderReview: number;
  startupsAwaitingReview: number;
  startupCount: number;
};

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    kyc: (<><circle cx="10" cy="8" r="3" /><path d="M4 19c0-3 2.7-5 6-5" /><path d="m14.5 14 2 2 3.5-3.5" /></>),
    deal: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    startup: (<><path d="M5 16c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M9 12a12 12 0 0 1 8-8c2 0 3 1 3 3a12 12 0 0 1-8 8l-3-3z" /><circle cx="14.5" cy="9.5" r="1.5" /></>),
    funds: (<><path d="M3 9 12 4l9 5" /><path d="M5 9v9M19 9v9M9.5 9v9M14.5 9v9" /><path d="M3 20h18" /></>),
    users: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 6" /></>),
    layers: (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {paths[name]}
    </svg>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [o, setO] = useState<Overview | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/overview", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 403) return setState("forbidden");
      setO(await res.json().catch(() => null));
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || !session || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  // Action queues — these draw the eye; highlighted when something's waiting.
  const attention = [
    { label: "KYC to review", value: o?.pendingKyc ?? 0, href: "/admin/kyc", icon: "kyc" },
    { label: "Deals awaiting committee", value: o?.dealsUnderReview ?? 0, href: "/admin/deals", icon: "deal" },
    { label: "Startups to review", value: o?.startupsAwaitingReview ?? 0, href: "/admin/startups", icon: "startup" },
    { label: "Funds to confirm", value: o?.awaitingFunds ?? 0, href: "/admin/contributions", icon: "funds" },
  ];
  const totalAttention = attention.reduce((s, a) => s + a.value, 0);

  // At-a-glance stats — calm, colour-chipped.
  const glance = [
    { label: "Verified investors", value: o?.verifiedInvestors ?? 0, href: "/admin/kyc", icon: "users", chip: "bg-frontier text-deep-frontier" },
    { label: "Published deals", value: o?.publishedDeals ?? 0, href: "/admin/deals", icon: "deal", chip: "bg-pitch text-deep-pitch" },
    { label: "Startups", value: o?.startupCount ?? 0, href: "/admin/startups", icon: "startup", chip: "bg-ignition/15 text-ignition-ink" },
    { label: "Syndicates", value: o?.syndicateCount ?? 0, href: "/admin/structures", icon: "layers", chip: "bg-frontier text-deep-frontier" },
    { label: "Investor cohorts", value: o?.cohortCount ?? 0, href: "/admin/structures", icon: "users", chip: "bg-pitch text-deep-pitch" },
  ];

  return (
    <main className="w-full flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-cosmic/70">Your operations dashboard — what needs attention and the platform at a glance.</p>
      <p className="mt-1 text-sm text-cosmic/60">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      {/* Needs your attention */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-cosmic">Needs your attention</h2>
        <span className="text-sm text-cosmic/60">{totalAttention === 0 ? "All clear 🎉" : `${totalAttention} item${totalAttention === 1 ? "" : "s"} waiting`}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {attention.map((a) => {
          const urgent = a.value > 0;
          return (
            <Link key={a.label} href={a.href} className="block">
              <Card className={`h-full transition-colors ${urgent ? "border-ignition/30 bg-ignition/[0.07] hover:border-ignition/50" : "bg-frontier/30 hover:border-cosmic/20"}`}>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${urgent ? "bg-ignition/15 text-ignition-ink" : "bg-venture/40 text-deep-frontier"}`}>
                  <Icon name={a.icon} />
                </span>
                <p className={`mt-3 font-display text-4xl font-semibold tracking-tight ${urgent ? "text-ignition-ink" : "text-cosmic/40"}`}>{a.value}</p>
                <p className="mt-0.5 text-sm font-medium text-cosmic/80">{a.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* At a glance */}
      <h2 className="mt-10 font-display text-lg font-semibold text-cosmic">At a glance</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {glance.map((g) => (
          <Link key={g.label} href={g.href} className="block">
            <Card className="h-full transition-colors hover:border-cosmic/25">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${g.chip}`}>
                <Icon name={g.icon} />
              </span>
              <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-cosmic">{g.value}</p>
              <p className="mt-0.5 text-sm text-cosmic/70">{g.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
