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
type Syndicate = { id: string; name: string; description: string | null; cohorts: Cohort[] };
type StartupCohort = { id: string; name: string; disbursedTotal: string };

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
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
  const [startups, setStartups] = useState<StartupCohort[]>([]);
  const [synName, setSynName] = useState("");
  const [synDesc, setSynDesc] = useState("");
  const [cohortName, setCohortName] = useState<Record<string, string>>({});
  const [startupName, setStartupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline rename: editKey is e.g. "syn:<id>" / "st:<id>".
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Disbursement form inputs, keyed by startup-cohort id.
  const [disbAmount, setDisbAmount] = useState<Record<string, string>>({});
  const [disbNote, setDisbNote] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/structures", { headers: await authHeaders() });
    if (res.status === 403) return setState("forbidden");
    const data = await res.json().catch(() => ({}));
    setSyndicates(data.syndicates ?? []);
    setStartups(data.startupCohorts ?? []);
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

  async function recordDisbursement(scId: string) {
    const amount = Number(disbAmount[scId]);
    if (!Number.isFinite(amount) || amount < 1) return;
    if (await post(`/api/admin/startup-cohorts/${scId}/disbursements`, { amount, note: disbNote[scId] ?? "" })) {
      setDisbAmount((m) => ({ ...m, [scId]: "" }));
      setDisbNote((m) => ({ ...m, [scId]: "" }));
    }
  }

  function startEdit(key: string, current: string) {
    setEditKey(key);
    setEditValue(current);
    setError(null);
  }

  async function createSyndicate(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/syndicates", { name: synName, description: synDesc })) { setSynName(""); setSynDesc(""); }
  }
  async function createCohort(syndicateId: string) {
    const name = cohortName[syndicateId]?.trim();
    if (!name) return;
    if (await post("/api/admin/cohorts", { syndicateId, name })) setCohortName((m) => ({ ...m, [syndicateId]: "" }));
  }
  async function createStartup(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/admin/startup-cohorts", { name: startupName })) setStartupName("");
  }

  if (isPending || state === "loading") {
    return <main className="flex flex-1 items-center justify-center text-cosmic/70">Loading…</main>;
  }
  if (state === "forbidden") {
    return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><h1 className="font-display text-2xl font-semibold">Admins only</h1></main>;
  }

  // Inline rename control (input + Save/Cancel), reused for syndicates + startup cohorts.
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
      <p className="mt-1 text-sm text-cosmic/70">Set up syndicates and investor cohorts, and allocate each cohort&rsquo;s pool across one or more portfolios.</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Syndicates */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Syndicates</h2>
        <p className="mt-1 text-sm text-cosmic/70">Top-level groups; each holds investor cohorts and their pools.</p>

        {/* Create — distinct dashed/tinted "add" box */}
        <div className="mt-3 rounded-2xl border border-dashed border-cosmic/25 bg-cosmic/[0.025] p-5">
          <p className="text-sm font-semibold text-cosmic">+ New syndicate</p>
          <form onSubmit={createSyndicate} className="mt-3 space-y-3">
            <Field label="Name" value={synName} onChange={(e) => setSynName(e.target.value)} required />
            <Field label="Description (optional)" value={synDesc} onChange={(e) => setSynDesc(e.target.value)} />
            <Button type="submit" disabled={busy}>Create syndicate</Button>
          </form>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-cosmic/50">Your syndicates ({syndicates.length})</p>
        <div className="mt-3 space-y-4">
          {syndicates.length === 0 && <p className="text-cosmic/70">No syndicates yet.</p>}
          {syndicates.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                {editKey === `syn:${s.id}` ? renameForm(`/api/admin/syndicates/${s.id}`) : (
                  <>
                    <p className="font-medium text-cosmic">{s.name}</p>
                    <span className="flex shrink-0 gap-3 text-sm">
                      <button onClick={() => startEdit(`syn:${s.id}`, s.name)} className="font-medium text-cosmic underline">Rename</button>
                      <ConfirmButton variant="outline" disabled={busy} onConfirm={() => remove(`/api/admin/syndicates/${s.id}`)}
                        title="Delete syndicate?" message={`Delete "${s.name}"? Only possible if it has no cohorts.`} confirmLabel="Delete">Delete</ConfirmButton>
                    </span>
                  </>
                )}
              </div>
              {s.description && editKey !== `syn:${s.id}` && <p className="mt-0.5 text-sm text-cosmic/60">{s.description}</p>}

              <p className="mt-4 text-sm font-medium text-cosmic/80">Investor cohorts</p>
              {s.cohorts.length === 0 ? (
                <p className="mt-1 text-sm text-cosmic/70">No cohorts yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {s.cohorts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/cohorts/${c.id}`} className="font-medium text-cosmic underline">{c.name}</Link>
                      <span className="flex items-center gap-2 text-cosmic/70">
                        {c.hasPool && <Badge tone="venture">pool</Badge>}
                        {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className={inputCls} placeholder="New cohort name" value={cohortName[s.id] ?? ""} onChange={(e) => setCohortName((m) => ({ ...m, [s.id]: e.target.value }))} />
                <Button disabled={busy} onClick={() => createCohort(s.id)} className="w-full shrink-0 whitespace-nowrap sm:w-auto">Add cohort</Button>
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
          <form onSubmit={createStartup} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name" value={startupName} onChange={(e) => setStartupName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">Create</Button>
          </form>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-cosmic/50">Your portfolios ({startups.length})</p>
        <div className="mt-3 space-y-4">
          {startups.length === 0 && <p className="text-cosmic/70">No portfolios yet.</p>}
          {startups.map((sc) => (
            <Card key={sc.id}>
              <div className="flex items-start justify-between gap-3">
                {editKey === `st:${sc.id}` ? renameForm(`/api/admin/startup-cohorts/${sc.id}`) : (
                  <>
                    <div>
                      <p className="font-medium text-cosmic">{sc.name}</p>
                      <p className="mt-0.5 text-sm text-cosmic/70">Disbursed: <span className="font-semibold text-cosmic">{money(sc.disbursedTotal)}</span></p>
                    </div>
                    <span className="flex shrink-0 gap-3 text-sm">
                      <button onClick={() => startEdit(`st:${sc.id}`, sc.name)} className="font-medium text-cosmic underline">Rename</button>
                      <ConfirmButton variant="outline" disabled={busy} onConfirm={() => remove(`/api/admin/startup-cohorts/${sc.id}`)}
                        title="Delete portfolio?" message={`Delete "${sc.name}"? Only possible if nothing is allocated to it.`} confirmLabel="Delete">Delete</ConfirmButton>
                    </span>
                  </>
                )}
              </div>

              {/* Record a disbursement (E7-S3) */}
              <div className="mt-3 flex flex-col gap-2 border-t border-cosmic/10 pt-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-[10rem]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cosmic/60">$</span>
                  <input type="number" min="1" step="1" inputMode="decimal" placeholder="Amount" aria-label={`Disbursement amount for ${sc.name}`}
                    value={disbAmount[sc.id] ?? ""} onChange={(e) => setDisbAmount((m) => ({ ...m, [sc.id]: e.target.value }))}
                    className="w-full rounded-lg border border-cosmic/15 bg-pioneer py-2 pl-7 pr-3 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30" />
                </div>
                <input className={inputCls} placeholder="Note (optional)" aria-label={`Disbursement note for ${sc.name}`}
                  value={disbNote[sc.id] ?? ""} onChange={(e) => setDisbNote((m) => ({ ...m, [sc.id]: e.target.value }))} />
                <Button disabled={busy || !disbAmount[sc.id]} onClick={() => recordDisbursement(sc.id)} className="w-full shrink-0 whitespace-nowrap sm:w-auto">Record disbursement</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
