"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, getToken } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Member = { userId: string; fullName: string | null; kycStatus: string | null };
type Assignable = { userId: string; fullName: string | null };
type Cohort = { id: string; name: string; syndicate: string | null };
type Alloc = { id: string; startupCohortId: string; startupName: string | null; percentage: number };
type StartupCohort = { id: string; name: string };

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

const inputCls =
  "w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30";

export default function CohortPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session, isPending } = useSession();

  const [state, setState] = useState<"loading" | "forbidden" | "notfound" | "ready">("loading");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignable, setAssignable] = useState<Assignable[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  const [allocations, setAllocations] = useState<Alloc[]>([]);
  const [startupCohorts, setStartupCohorts] = useState<StartupCohort[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [allocStartup, setAllocStartup] = useState("");
  const [allocPct, setAllocPct] = useState("");
  const [allocError, setAllocError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function load() {
    const headers = await authHeaders();
    const [mRes, aRes] = await Promise.all([
      fetch(`/api/admin/cohorts/${id}/members`, { headers }),
      fetch(`/api/admin/cohorts/${id}/allocations`, { headers }),
    ]);
    if (mRes.status === 403) return setState("forbidden");
    if (mRes.status === 404) return setState("notfound");
    const data = await mRes.json().catch(() => ({}));
    if (!data.cohort) return setState("notfound");
    setCohort(data.cohort);
    setMembers(data.members ?? []);
    setAssignable(data.assignable ?? []);
    setSelected("");
    if (aRes.ok) {
      const a = await aRes.json().catch(() => ({}));
      setAllocations(a.allocations ?? []);
      setStartupCohorts(a.startupCohorts ?? []);
      setTotalAllocated(a.totalAllocated ?? 0);
      setEdits({});
    }
    setState("ready");
  }

  useEffect(() => {
    if (isPending) return;
    if (!session) return void router.replace("/login");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, id]);

  async function addMember() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch(`/api/admin/cohorts/${id}/members`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId: selected }),
    });
    setBusy(false);
    if (res.ok) await load();
  }

  async function removeMember(userId: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/cohorts/${id}/members`, {
      method: "DELETE",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (res.ok) await load();
  }

  // Create or update an allocation (used by both the add form and inline edits).
  async function postAllocation(startupCohortId: string, percentage: number) {
    setBusy(true);
    setAllocError(null);
    const res = await fetch(`/api/admin/cohorts/${id}/allocations`, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ startupCohortId, percentage }),
    });
    setBusy(false);
    if (res.ok) {
      await load();
      return true;
    }
    const d = await res.json().catch(() => ({}));
    setAllocError(d.error ?? "Couldn't save the allocation.");
    return false;
  }

  async function addAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (await postAllocation(allocStartup, Number(allocPct))) {
      setAllocStartup("");
      setAllocPct("");
    }
  }

  async function removeAllocation(startupCohortId: string) {
    setBusy(true);
    setAllocError(null);
    const res = await fetch(`/api/admin/cohorts/${id}/allocations`, {
      method: "DELETE",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ startupCohortId }),
    });
    setBusy(false);
    if (res.ok) await load();
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
  if (state === "notfound" || !cohort) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold">Cohort not found</h1>
        <Link href="/admin/structures" className="mt-3 inline-block font-medium text-cosmic underline">← Structures</Link>
      </main>
    );
  }

  const remaining = 100 - totalAllocated;
  const unallocated = startupCohorts.filter((sc) => !allocations.some((a) => a.startupCohortId === sc.id));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/admin/structures" className="text-cosmic/60 underline">← Structures</Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{cohort.name}</h1>
      {cohort.syndicate && <p className="mt-1 text-cosmic/60">{cohort.syndicate}</p>}

      {/* Members */}
      <Card className="mt-6">
        <p className="font-medium text-cosmic">Members ({members.length})</p>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-cosmic/70">No investors assigned yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-cosmic">{m.fullName ?? m.userId}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {m.kycStatus && <Badge tone={m.kycStatus === "verified" ? "venture" : "neutral"}>{m.kycStatus}</Badge>}
                  <button onClick={() => removeMember(m.userId)} disabled={busy} className="font-medium text-danger underline">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Assign member */}
      <Card className="mt-4">
        <p className="font-medium text-cosmic">Assign a verified investor</p>
        {assignable.length === 0 ? (
          <p className="mt-2 text-sm text-cosmic/70">No verified investors available to add.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputCls}>
              <option value="">Select an investor…</option>
              {assignable.map((a) => (
                <option key={a.userId} value={a.userId}>{a.fullName ?? a.userId}</option>
              ))}
            </select>
            <Button onClick={addMember} disabled={busy || !selected} className="w-full sm:w-auto">Add</Button>
          </div>
        )}
      </Card>

      {/* Pool allocation */}
      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-cosmic">Pool allocation</p>
          <Badge tone={remaining === 0 ? "venture" : "pitch"}>{totalAllocated}% allocated · {remaining}% left</Badge>
        </div>
        <p className="mt-1 text-sm text-cosmic/70">Split this cohort&apos;s pool across startup cohorts (must total ≤ 100%).</p>

        {allocations.length > 0 && (
          <ul className="mt-3 divide-y divide-cosmic/10 border-t border-cosmic/10">
            {allocations.map((a) => {
              const val = edits[a.startupCohortId] ?? String(a.percentage);
              const changed = val !== String(a.percentage);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-cosmic">{a.startupName ?? a.startupCohortId}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <input
                      type="number" min={1} max={100} value={val}
                      onChange={(e) => setEdits((m) => ({ ...m, [a.startupCohortId]: e.target.value }))}
                      className="w-16 rounded-lg border border-cosmic/15 bg-pioneer px-2 py-1 text-sm outline-none focus:border-venture"
                    />
                    <span className="text-cosmic/60">%</span>
                    <button
                      onClick={() => postAllocation(a.startupCohortId, Number(val))}
                      disabled={busy || !changed || !val}
                      className="font-medium text-cosmic underline disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button onClick={() => removeAllocation(a.startupCohortId)} disabled={busy} className="font-medium text-danger underline">Remove</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {startupCohorts.length === 0 ? (
          <p className="mt-3 text-sm text-cosmic/70">Create a startup cohort first (Structures page).</p>
        ) : unallocated.length === 0 ? (
          <p className="mt-3 text-sm text-cosmic/70">Every startup cohort is allocated. Edit a percentage above or remove one to free it up.</p>
        ) : (
          <form onSubmit={addAllocation} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={allocStartup} onChange={(e) => setAllocStartup(e.target.value)} required className={inputCls}>
              <option value="">Startup cohort…</option>
              {unallocated.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
            <input
              type="number" min={1} max={100} required value={allocPct}
              onChange={(e) => setAllocPct(e.target.value)} placeholder="%"
              className="w-full rounded-lg border border-cosmic/15 bg-pioneer px-3 py-2 text-sm outline-none focus:border-venture focus:ring-2 focus:ring-venture/30 sm:w-24"
            />
            <Button type="submit" disabled={busy || !allocStartup || !allocPct} className="w-full shrink-0 whitespace-nowrap sm:w-auto">
              Allocate
            </Button>
          </form>
        )}
        {allocError && <p className="mt-2 text-sm text-danger">{allocError}</p>}
      </Card>
    </main>
  );
}
