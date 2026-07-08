"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Portfolio = { id: string; name: string; percentage: number; startupCount: number };
type Cohort = { id: string; name: string };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "unverified" | "ready">("loading");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const res = await fetch("/api/portfolio", { headers: await authHeaders() });
      if (res.status === 403) return setState("unverified");
      const data = await res.json().catch(() => ({}));
      setCohort(data.cohort ?? null);
      setPortfolios(data.portfolios ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  if (state === "unverified") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your portfolio</h1>
        <Card className="mt-6">
          <p className="text-sm font-medium text-cosmic">Get verified first</p>
          <p className="mt-1 text-sm text-cosmic/70">Complete identity verification (KYC) to see the startups your cohort invests in.</p>
          <Link href="/profile" className="mt-3 inline-flex items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90">Complete verification</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/dashboard" className="text-cosmic/60 underline">&larr; Dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your portfolio</h1>
      <p className="mt-1 text-sm text-cosmic/70">The portfolios your cohort&rsquo;s pool is invested across. Open one to see its startups.</p>

      {!cohort ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-cosmic">You&rsquo;ll be placed in a cohort soon</p>
          <p className="mt-1 text-sm text-cosmic/70">Once StarSector8 assigns you to a cohort and allocates its pool, your portfolios show here.</p>
        </Card>
      ) : portfolios.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-cosmic">Nothing allocated yet</p>
          <p className="mt-1 text-sm text-cosmic/70">Your cohort ({cohort.name}) hasn&rsquo;t been allocated to any portfolios yet. Check back soon.</p>
        </Card>
      ) : (
        <>
          <p className="mt-4 text-sm text-cosmic/60">Cohort: <span className="font-medium text-cosmic">{cohort.name}</span></p>
          <div className="mt-3 space-y-3">
            {portfolios.map((p) => (
              <Link key={p.id} href={`/portfolio/${p.id}`} className="block">
                <Card className="flex items-center justify-between gap-3 transition-colors hover:border-cosmic/25">
                  <div className="min-w-0">
                    <p className="font-medium text-cosmic">{p.name}</p>
                    <p className="mt-0.5 text-sm text-cosmic/60">{p.startupCount} {p.startupCount === 1 ? "startup" : "startups"}</p>
                  </div>
                  <Badge tone="pitch" className="shrink-0">{p.percentage}% of pool</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
