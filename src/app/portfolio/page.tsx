"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Contribution = {
  id: string;
  dealId: string;
  startupName: string;
  amount: string;
  currency: string;
  reference: string;
  status: string;
};

const money = (amount: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  pledged: { tone: "neutral", label: "Awaiting payment" },
  paid: { tone: "pitch", label: "Payment reported" },
  confirmed: { tone: "venture", label: "Confirmed" },
  cancelled: { tone: "ignition", label: "Cancelled" },
};

export default function PortfolioPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "not_verified" | "ready">("loading");
  const [items, setItems] = useState<Contribution[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/portfolio", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 403) return setState("not_verified");
      const data = await res.json().catch(() => ({}));
      setItems(data.contributions ?? []);
      setState("ready");
    })();
  }, [isPending, session, router]);

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }

  if (state === "not_verified") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your contributions</h1>
        <Card className="mt-6">
          <p className="font-medium text-cosmic">Get verified first</p>
          <p className="mt-1 text-sm text-cosmic/70">Verify your identity to start contributing to deals.</p>
          <Link href="/profile" className="mt-4 inline-flex items-center justify-center rounded-lg bg-cosmic px-4 py-2.5 text-sm font-medium text-pioneer hover:bg-cosmic/90">Go to profile</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your contributions</h1>
      <p className="mt-1 text-sm text-cosmic/70">Track your pledges through to confirmation.</p>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="font-medium text-cosmic">No contributions yet</p>
          <p className="mt-1 text-sm text-cosmic/70">
            When you pledge to a deal it&rsquo;ll show here.{" "}
            <Link href="/deals" className="font-medium text-ignition-ink underline">Browse deals</Link>
          </p>
        </Card>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((c) => {
            const s = STATUS[c.status] ?? STATUS.pledged;
            return (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/deals/${c.dealId}`} className="font-display text-lg font-semibold tracking-tight text-cosmic underline">
                        {c.startupName}
                      </Link>
                      <p className="mt-1 text-sm text-cosmic/70">
                        {money(c.amount, c.currency)} · ref <span className="font-mono">{c.reference}</span>
                      </p>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
