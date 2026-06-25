"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";

type Contribution = {
  id: string;
  dealId: string;
  startupName: string;
  investorEmail: string | null;
  amount: string;
  currency: string;
  reference: string;
  status: string;
};

const money = (amount: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));

const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  pledged: { tone: "neutral", label: "Pledged" },
  paid: { tone: "pitch", label: "Payment reported" },
  confirmed: { tone: "venture", label: "Confirmed" },
  cancelled: { tone: "ignition", label: "Cancelled" },
};

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function AdminContributionsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [items, setItems] = useState<Contribution[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/contributions", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setItems(data.contributions ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function act(id: string, action: "confirm" | "cancel") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/contributions/${id}`, {
      method: "PATCH",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (res.ok) await load();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't update the contribution.");
    }
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  const awaiting = items.filter((c) => c.status === "paid").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Contributions</h1>
      <p className="mt-1 text-sm text-cosmic/70">
        {awaiting > 0 ? `${awaiting} awaiting confirmation` : "Nothing awaiting confirmation"} · {items.length} total
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="text-cosmic/70">No contributions yet.</p>}
        {items.map((c) => {
          const s = STATUS[c.status] ?? STATUS.pledged;
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/deals/${c.dealId}`} className="font-medium text-cosmic underline">{c.startupName}</Link>
                  <p className="mt-0.5 text-sm text-cosmic/70">
                    {c.investorEmail ?? "—"} · {money(c.amount, c.currency)} · ref <span className="font-mono">{c.reference}</span>
                  </p>
                </div>
                <Badge tone={s.tone} className="shrink-0">{s.label}</Badge>
              </div>
              {(c.status === "paid" || c.status === "pledged") && (
                <div className="mt-3 flex gap-3">
                  {c.status === "paid" && (
                    <ConfirmButton
                      variant="accent"
                      disabled={busyId === c.id}
                      onConfirm={() => act(c.id, "confirm")}
                      title="Confirm funds received?"
                      message={`This marks ${c.investorEmail ?? "the investor"}'s ${money(c.amount, c.currency)} contribution to ${c.startupName} as confirmed and emails them. Do this only once the transfer has cleared.`}
                      confirmLabel="Confirm funds"
                    >
                      Confirm funds received
                    </ConfirmButton>
                  )}
                  <ConfirmButton
                    variant="outline"
                    disabled={busyId === c.id}
                    onConfirm={() => act(c.id, "cancel")}
                    title="Cancel this contribution?"
                    message={`This cancels ${c.investorEmail ?? "the investor"}'s ${money(c.amount, c.currency)} contribution to ${c.startupName}.`}
                    confirmLabel="Cancel contribution"
                  >
                    Cancel
                  </ConfirmButton>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
