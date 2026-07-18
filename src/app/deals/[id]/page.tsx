"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Linkify } from "@/components/ui/external-link";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

type Deal = { id: string; startupName: string; description: string | null; fundingGoal: string | null; valuation: string | null; terms: string | null; publishedAt: string | null };
type Doc = { id: string; filename: string; uploadedAt: string };
type FounderDoc = { id: string; kind: string; filename: string; uploadedAt: string };
type Contribution = { id: string; amount: string; currency: string; reference: string; status: string };

const money = (amount: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));

const KIND_LABEL: Record<string, string> = { pitch: "Pitch deck", dd: "Due diligence", kyc: "Founder ID/KYC", other: "Other" };

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
  const [founderDocs, setFounderDocs] = useState<FounderDoc[]>([]);
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [escrow, setEscrow] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
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
    setFounderDocs(data.founderDocuments ?? []);
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

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/deals/${id}/contribute`, {
      method: "PATCH",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ amount: Number(editAmount) }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't update your pledge.");
    }
  }

  async function cancelPledge() {
    setError(null);
    const res = await fetch(`/api/deals/${id}/contribute`, { method: "DELETE", headers: await authHeaders() });
    if (res.ok) await load();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't cancel your pledge.");
    }
  }

  async function viewDoc(docId: string) {
    const res = await fetch(`/api/deals/document?id=${docId}`, { headers: await authHeaders() });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  async function viewFounderDoc(docId: string) {
    const res = await fetch(`/api/deals/startup-document?id=${docId}`, { headers: await authHeaders() });
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

  // A cancelled pledge is treated as "no active contribution" so the investor
  // can pledge again.
  const active = contribution && contribution.status !== "cancelled" ? contribution : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/deals" className="text-cosmic/60 underline">&larr; All deals</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{deal.startupName}</h1>
        <Badge tone="venture">Open</Badge>
      </div>
      {deal.description && <p className="mt-2 text-sm text-cosmic/70"><Linkify text={deal.description} /></p>}

      {/* Deal terms */}
      {(deal.fundingGoal || deal.valuation || deal.terms) && (
        <Card className="mt-6">
          <p className="font-display text-lg font-semibold text-cosmic">Deal terms</p>
          <dl className="mt-2 space-y-2 text-sm">
            {deal.fundingGoal && <div className="flex justify-between gap-3"><dt className="text-cosmic/70">Funding goal</dt><dd className="font-medium text-cosmic">{money(deal.fundingGoal)}</dd></div>}
            {deal.valuation && <div className="flex justify-between gap-3"><dt className="text-cosmic/70">Valuation</dt><dd className="font-medium text-cosmic">{deal.valuation}</dd></div>}
            {deal.terms && <div><dt className="text-cosmic/70">Investment terms</dt><dd className="mt-0.5 whitespace-pre-wrap text-cosmic"><Linkify text={deal.terms} /></dd></div>}
          </dl>
        </Card>
      )}

      {/* Contribution */}
      <Card className="mt-6">
        <p className="font-display text-lg font-semibold text-cosmic">Your contribution</p>

        {!active && (
          <form onSubmit={pledge} className="mt-3 space-y-3">
            <p className="text-sm text-cosmic/70">Indicate how much you&rsquo;d like to contribute to this deal.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cosmic/60">$</span>
                <input
                  type="number" min="1" step="1" required inputMode="decimal" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Contribution amount in US dollars"
                  className="w-full rounded-lg border border-cosmic/15 bg-pioneer py-2 pl-7 pr-3 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
                />
              </div>
              <Button type="submit" variant="accent" disabled={busy} className="w-full sm:w-auto">Pledge</Button>
            </div>
          </form>
        )}

        {active && (
          <div className="mt-3 space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-cosmic/70">
                Pledged <span className="font-semibold text-cosmic">{money(active.amount, active.currency)}</span>
              </span>
              <Badge tone={active.status === "confirmed" ? "venture" : active.status === "paid" ? "pitch" : "neutral"}>
                {active.status === "pledged" ? "Awaiting payment"
                  : active.status === "paid" ? "Payment reported"
                  : active.status === "confirmed" ? "Confirmed" : active.status}
              </Badge>
            </div>

            {active.status === "pledged" && (
              <>
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
                    <span className="font-mono font-semibold text-cosmic">{active.reference}</span>
                  </p>
                  <p className="mt-1 text-xs text-cosmic/60">Once you&rsquo;ve sent the funds, mark it below — StarSector8 will confirm receipt.</p>
                  <ConfirmButton
                    variant="accent"
                    className="mt-4"
                    disabled={busy}
                    onConfirm={markPaid}
                    title="Confirm payment sent"
                    message="Only do this after you've made the bank transfer. You won't be able to edit or cancel your pledge yourself afterwards."
                    confirmLabel="Yes, I've sent it"
                  >
                    I&rsquo;ve sent the funds
                  </ConfirmButton>
                </div>

                {editing ? (
                  <form onSubmit={saveEdit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-xs">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cosmic/60">$</span>
                      <input
                        type="number" min="1" step="1" required inputMode="decimal" value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)} placeholder="New amount" aria-label="New contribution amount in US dollars"
                        className="w-full rounded-lg border border-cosmic/15 bg-pioneer py-2 pl-7 pr-3 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={busy}>Save</Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" disabled={busy} onClick={() => { setEditAmount(String(Number(active.amount))); setEditing(true); }}>
                      Edit amount
                    </Button>
                    <ConfirmButton
                      variant="outline"
                      disabled={busy}
                      onConfirm={cancelPledge}
                      title="Cancel this pledge?"
                      message="This withdraws your pledge to this deal. You can pledge again later if you change your mind."
                      confirmLabel="Cancel pledge"
                    >
                      Cancel pledge
                    </ConfirmButton>
                  </div>
                )}
              </>
            )}

            {active.status === "paid" && (
              <p className="rounded-lg border border-cosmic/10 bg-pitch/40 p-4 text-cosmic/80">
                Thanks — we&rsquo;ve recorded that you sent the funds (ref{" "}
                <span className="font-mono font-semibold">{active.reference}</span>). StarSector8 will confirm once the
                transfer is received.
              </p>
            )}

            {active.status === "confirmed" && (
              <p className="rounded-lg border border-cosmic/10 bg-frontier/40 p-4 text-cosmic/80">
                Your contribution is confirmed. Thank you for investing in {deal.startupName}.
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* Deal Room — documents from the startup profile, plus any deal-specific extras */}
      <Card className="mt-4">
        <p className="font-display text-lg font-semibold text-cosmic">Deal Room</p>
        <p className="mt-1 text-sm text-cosmic/70">Due-diligence documents for this opportunity.</p>
        {founderDocs.length === 0 && docs.length === 0 ? (
          <p className="mt-3 text-sm text-cosmic/70">No documents have been shared yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {founderDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic"><span className="text-cosmic/60">{KIND_LABEL[d.kind] ?? d.kind}:</span> {d.filename}</span>
                <button onClick={() => viewFounderDoc(d.id)} aria-label={`View ${d.filename}`} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-cosmic">{d.filename}</span>
                <button onClick={() => viewDoc(d.id)} aria-label={`View ${d.filename}`} className="shrink-0 font-medium text-ignition-ink underline">View</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
