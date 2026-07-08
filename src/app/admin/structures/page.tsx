"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";

type Cohort = { id: string; name: string; hasPool: boolean; memberCount: number };
type Portfolio = { id: string; name: string; disbursedTotal: string };

const money = (v: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

const inputCls =
  "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

export default function StructuresPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "ready">("loading");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [cohortName, setCohortName] = useState("");
  const [portfolioName, setPortfolioName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline rename for portfolios ("pf:<id>"). Cohorts are renamed on their detail page.
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [disbAmount, setDisbAmount] = useState<Record<string, string>>({});
  const [disbNote, setDisbNote] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/structures", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setCohorts(data.cohorts ?? []);
    setPortfolios(data.startupCohorts ?? []);
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "POST", headers: await authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
    return res.ok;
  }

  async function rename(url: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "PATCH", headers: await authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ name: editValue }) });
    setBusy(false);
    if (res.ok) { setEditKey(null); await load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't rename.");
  }

  async function remove(url: string) {
    setError(null);
    const res = await fetch(url, { method: "DELETE", headers: await authHeaders() });
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error ?? "Couldn't delete.");
  }

  async function recordDisbursement(pfId: string) {
    const amount = Number(disbAmount[pfId]);
    if (!Number.isFinite(amount) || amount < 1) return;
    if (await post(`/api/admin/startup-cohorts/${pfId}/disbursements`, { amount, note: disbNote[pfId] ?? "" })) {
      setDisbAmount((m) => ({ ...m, [pfId]: "" }));
      setDisbNote((m) => ({ ...m, [pfId]: "" }));
    }
  }

  function startEdit(key: string, current: string) {
    setEditKey(key);
    setEditValue(current);
    setError(null);
  }

  async function createCohort(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/cohorts", { name: cohortName })) setCohortName("");
  }
  async function createPortfolio(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/startup-cohorts", { name: portfolioName })) setPortfolioName("");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  const renameForm = (url: string) => (
    <div className="flex flex-1 items-center gap-2">
      <input className={inputCls} value={editValue} onChange={(e) => setEditValue(e.target.value)} aria-label="New name" />
      <Button disabled={busy || !editValue.trim()} onClick={() => rename(url)} className="shrink-0">Save</Button>
      <Button variant="outline" disabled={busy} onClick={() => setEditKey(null)} className="shrink-0">Cancel</Button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Investment structures</h1>
      <p className="mt-1 text-sm text-cosmic/70">Set up investor cohorts and allocate each cohort&rsquo;s pool across one or more portfolios.</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Investor cohorts */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Investor cohorts</h2>
        <p className="mt-1 text-sm text-cosmic/70">Groups of investors pooling capital. Each cohort has a pool; open one to manage members and allocate its pool across portfolios.</p>

        {/* Create — distinct dashed/tinted "add" box */}
        <div className="mt-3 rounded-2xl border border-dashed border-cosmic/25 bg-cosmic/[0.025] p-5">
          <p className="text-sm font-semibold text-cosmic">+ New cohort</p>
          <form onSubmit={createCohort} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name" value={cohortName} onChange={(e) => setCohortName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">Create</Button>
          </form>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-cosmic/50">Your cohorts ({cohorts.length})</p>
        <div className="mt-3 space-y-3">
          {cohorts.length === 0 && <p className="text-cosmic/70">No cohorts yet.</p>}
          {cohorts.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/cohorts/${c.id}`} className="font-medium text-cosmic underline">{c.name}</Link>
                <span className="flex items-center gap-2 text-sm text-cosmic/70">
                  {c.hasPool && <Badge tone="venture">pool</Badge>}
                  {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Portfolios (a group of startups a cohort's pool is deployed into) */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Portfolios</h2>
        <p className="mt-1 text-sm text-cosmic/70">Groups of startups a cohort&rsquo;s pool is deployed into — a cohort can be allocated across several portfolios. These are capital-deployment buckets, <span className="text-cosmic">not</span> the founder-submitted startup profiles.</p>

        {/* Create — distinct dashed/tinted "add" box */}
        <div className="mt-3 rounded-2xl border border-dashed border-cosmic/25 bg-cosmic/[0.025] p-5">
          <p className="text-sm font-semibold text-cosmic">+ New portfolio</p>
          <form onSubmit={createPortfolio} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name" value={portfolioName} onChange={(e) => setPortfolioName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">Create</Button>
          </form>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-cosmic/50">Your portfolios ({portfolios.length})</p>
        <div className="mt-3 space-y-4">
          {portfolios.length === 0 && <p className="text-cosmic/70">No portfolios yet.</p>}
          {portfolios.map((pf) => (
            <Card key={pf.id}>
              <div className="flex items-start justify-between gap-3">
                {editKey === `pf:${pf.id}` ? renameForm(`/api/admin/startup-cohorts/${pf.id}`) : (
                  <>
                    <div>
                      <p className="font-medium text-cosmic">{pf.name}</p>
                      <p className="mt-0.5 text-sm text-cosmic/70">Disbursed: <span className="font-semibold text-cosmic">{money(pf.disbursedTotal)}</span></p>
                    </div>
                    <span className="flex shrink-0 gap-3 text-sm">
                      <button onClick={() => startEdit(`pf:${pf.id}`, pf.name)} className="font-medium text-cosmic underline">Rename</button>
                      <ConfirmButton variant="outline" disabled={busy} onConfirm={() => remove(`/api/admin/startup-cohorts/${pf.id}`)}
                        title="Delete portfolio?" message={`Delete "${pf.name}"? Only possible if nothing is allocated to it.`} confirmLabel="Delete">Delete</ConfirmButton>
                    </span>
                  </>
                )}
              </div>

              {/* Record a disbursement (E7-S3) */}
              <div className="mt-3 flex flex-col gap-2 border-t border-cosmic/10 pt-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-[10rem]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cosmic/60">$</span>
                  <input type="number" min="1" step="1" inputMode="decimal" placeholder="Amount" aria-label={`Disbursement amount for ${pf.name}`}
                    value={disbAmount[pf.id] ?? ""} onChange={(e) => setDisbAmount((m) => ({ ...m, [pf.id]: e.target.value }))}
                    className="w-full rounded-lg border border-cosmic/15 bg-pioneer py-2 pl-7 pr-3 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
                </div>
                <input className={inputCls} placeholder="Note (optional)" aria-label={`Disbursement note for ${pf.name}`}
                  value={disbNote[pf.id] ?? ""} onChange={(e) => setDisbNote((m) => ({ ...m, [pf.id]: e.target.value }))} />
                <Button disabled={busy || !disbAmount[pf.id]} onClick={() => recordDisbursement(pf.id)} className="w-full shrink-0 whitespace-nowrap sm:w-auto">Record disbursement</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
