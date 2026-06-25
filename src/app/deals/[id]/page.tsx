"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Deal = { id: string; startupName: string; description: string | null; publishedAt: string | null };
type Doc = { id: string; filename: string; uploadedAt: string };
type Contribution = { id: string; amount: string; currency: string; reference: string; status: string };

const money = (amount: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function InvestorDealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [escrow, setEscrow] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/deals/${id}`, { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    if (res.status === 404) return setState("notfound");
    const data = await res.json().catch(() => ({}));
    if (!data.deal) return setState("notfound");
    setDeal(data.deal);
    setDocs(data.documents ?? []);
    setContribution(data.contribution ?? null);
    setEscrow(data.escrowInstructions ?? "");
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function pledge(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/deals/${id}/contribute`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ amount: Number(amount) }),
    });
    setBusy(false);
    if (res.ok) {
      setAmount("");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't record your pledge.");
    }
  }

  async function markPaid() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/deals/${id}/paid`, { method: "POST", headers: await authHeaders() });
    setBusy(false);
    if (res.ok) await load();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't update your contribution.");
    }
  }

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/deals/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-sm text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Get verified to view this deal</h1>
        <Link href="/profile" className="mt-3 inline-block font-medium text-ignition-ink underline">Go to profile</Link>
      </main>
    );
  }
  if (state === "notfound" || !deal) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Deal not available</h1>
        <Link href="/deals" className="mt-3 inline-block font-medium text-cosmic underline">&larr; All deals</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/deals" className="text-cosmic/60 underline">&larr; All deals</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{deal.startupName}</h1>
        <Badge tone="venture">Open</Badge>
      </div>
      {deal.description && <p className="mt-2 text-sm text-cosmic/70">{deal.description}</p>}

      {/* Contribution */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">Your contribution</p>

        {!contribution && (
          <form onSubmit={pledge} className="mt-3 space-y-3">
            <p className="text-sm text-cosmic/70">Indicate how much you&rsquo;d like to contribute to this deal.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cosmic/60">$</span>
                <input
                  type="number" min="1" step="1" required inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="Amount"
                  className="w-full rounded-lg border border-cosmic/15 bg-pioneer py-2 pl-7 pr-3 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
                />
              </div>
              <Button type="submit" variant="accent" disabled={busy} className="w-full sm:w-auto">Pledge</Button>
            </div>
          </form>
        )}

        {contribution && (
          <div className="mt-3 space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-cosmic/70">
                Pledged <span className="font-semibold text-cosmic">{money(contribution.amount, contribution.currency)}</span>
              </span>
              <Badge tone={contribution.status === "confirmed" ? "venture" : contribution.status === "paid" ? "pitch" : "neutral"}>
                {contribution.status === "pledged" ? "Awaiting payment"
                  : contribution.status === "paid" ? "Payment reported"
                  : contribution.status === "confirmed" ? "Confirmed" : contribution.status}
              </Badge>
            </div>

            {contribution.status === "pledged" && (
              <div className="rounded-lg border border-cosmic/10 bg-frontier/40 p-4">
                <p className="font-medium text-cosmic">Funding instructions</p>
                {escrow ? (
                  <p className="mt-1 whitespace-pre-wrap text-cosmic/70">{escrow}</p>
                ) : (
                  <p className="mt-1 text-cosmic/70">
                    StarSector8 operates a manual escrow. The escrow account details will be shared with you to complete your transfer.
                  </p>
                )}
                <p className="mt-3">
                  Quote this payment reference on your transfer:{" "}
                  <span className="font-mono font-semibold text-cosmic">{contribution.reference}</span>
                </p>
                <p className="mt-1 text-xs text-cosmic/60">Once you&rsquo;ve sent the funds, mark it below — StarSector8 will confirm receipt.</p>
                <Button variant="accent" disabled={busy} onClick={markPaid} className="mt-4">I&rsquo;ve sent the funds</Button>
              </div>
            )}

            {contribution.status === "paid" && (
              <p className="rounded-lg border border-cosmic/10 bg-pitch/40 p-4 text-cosmic/80">
                Thanks — we&rsquo;ve recorded that you sent the funds (ref{" "}
                <span className="font-mono font-semibold">{contribution.reference}</span>). StarSector8 will confirm once the
                transfer is received.
              </p>
            )}

            {contribution.status === "confirmed" && (
              <p className="rounded-lg border border-cosmic/10 bg-frontier/40 p-4 text-cosmic/80">
                Your contribution is confirmed. Thank you for investing in {deal.startupName}.
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* Deal Room — due-diligence documents */}
      <Card className="mt-4">
        <p className="font-medium text-cosmic">Deal Room</p>
        <p className="mt-1 text-sm text-cosmic/70">Due-diligence documents for this opportunity.</p>
        {docs.length === 0 ? (
          <p className="mt-3 text-sm text-cosmic/70">No documents have been shared yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic">{d.filename}</span>
                <button onClick={() => viewDoc(d.id)} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
