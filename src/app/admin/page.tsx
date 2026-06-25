"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Overview = {
  pendingKyc: number;
  verifiedInvestors: number;
  syndicateCount: number;
  cohortCount: number;
  publishedDeals: number;
  awaitingFunds: number;
};

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

  const tiles = [
    { label: "KYC awaiting review", value: o?.pendingKyc ?? 0, href: "/admin/kyc", urgent: (o?.pendingKyc ?? 0) > 0 },
    { label: "Funds awaiting confirmation", value: o?.awaitingFunds ?? 0, href: "/admin/contributions", urgent: (o?.awaitingFunds ?? 0) > 0 },
    { label: "Verified investors", value: o?.verifiedInvestors ?? 0, href: "/admin/kyc" },
    { label: "Published deals", value: o?.publishedDeals ?? 0, href: "/admin/deals" },
    { label: "Syndicates", value: o?.syndicateCount ?? 0, href: "/admin/structures" },
    { label: "Investor cohorts", value: o?.cohortCount ?? 0, href: "/admin/structures" },
  ];

  return (
    <main className="w-full flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        Signed in as <span className="font-medium text-cosmic">{session.user.email}</span>
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="block">
            <Card className="transition-colors hover:border-cosmic/25">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-cosmic/70">{t.label}</p>
                {t.urgent && <Badge tone="ignition">action</Badge>}
              </div>
              <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-cosmic">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
