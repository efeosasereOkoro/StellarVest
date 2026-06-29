"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Deal = { id: string; startupName: string; status: string };
type ApprovedStartup = { id: string; name: string; description: string | null };

export const STATUS: Record<string, { tone: "venture" | "pitch" | "ignition" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  under_review: { tone: "pitch", label: "Under review" },
  approved: { tone: "venture", label: "Approved" },
  declined: { tone: "ignition", label: "Declined" },
  published: { tone: "venture", label: "Published" },
};

const inputCls =
  "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export default function DealsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [approved, setApproved] = useState<ApprovedStartup[]>([]);
  const [startupId, setStartupId] = useState("");
  const [desc, setDesc] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [valuation, setValuation] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/deals", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setDeals(data.deals ?? []);
    setApproved(data.approvedStartups ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  // Selecting a startup auto-fills the description from its approved profile.
  function pickStartup(id: string) {
    setStartupId(id);
    const s = approved.find((a) => a.id === id);
    setDesc(s?.description ?? "");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/deals", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ startupId, description: desc, fundingGoal: Number(fundingGoal) || undefined, valuation, terms }),
    });
    setBusy(false);
    if (res.ok) {
      setStartupId(""); setDesc(""); setFundingGoal(""); setValuation(""); setTerms("");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't create the deal.");
    }
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
      </main>
    );
  }

  const needsReview = deals.filter((d) => d.status === "under_review");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Deals</h1>
      <p className="mt-1 text-sm text-cosmic/70">Create deals from approved startups, take them through committee review, and publish to investors.</p>

      {needsReview.length > 0 && (
        <Card className="mt-6 border-pitch bg-pitch/20">
          <p className="font-medium text-cosmic">Awaiting committee review ({needsReview.length})</p>
          <ul className="mt-2 space-y-1.5">
            {needsReview.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/admin/deals/${d.id}`} className="min-w-0 truncate font-medium text-cosmic underline">{d.startupName}</Link>
                <Link href={`/admin/deals/${d.id}`} className="shrink-0 font-medium text-ignition-ink underline">Review →</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Create a deal from an approved startup */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">New deal</p>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-cosmic/70">
            No approved startups yet. <Link href="/admin/startups" className="font-medium text-ignition-ink underline">Review &amp; approve a startup</Link> first — deals are created from approved startups.
          </p>
        ) : (
          <form onSubmit={create} className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Startup (approved)</span>
              <select value={startupId} onChange={(e) => pickStartup(e.target.value)} required className={inputCls}>
                <option value="">Select an approved startup…</option>
                {approved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Description <span className="font-normal text-cosmic/50">(from the startup — editable)</span></span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Funding goal (USD)" type="number" min="0" value={fundingGoal} onChange={(e) => setFundingGoal(e.target.value)} placeholder="e.g. 250000" />
              <Field label="Valuation" value={valuation} onChange={(e) => setValuation(e.target.value)} placeholder="e.g. $5M cap" />
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-cosmic/80">Investment terms</span>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} placeholder="e.g. SAFE, post-money; min ticket $1,000" className={inputCls} />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy || !startupId}>Create deal</Button>
          </form>
        )}
      </Card>

      <div className="mt-6 space-y-3">
        {deals.length === 0 && <p className="text-cosmic/70">No deals yet.</p>}
        {deals.map((d) => {
          const s = STATUS[d.status] ?? STATUS.draft;
          return (
            <Link key={d.id} href={`/admin/deals/${d.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-cosmic/25">
                <span className="min-w-0 truncate font-medium text-cosmic">{d.startupName}</span>
                <Badge tone={s.tone} className="shrink-0">{s.label}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
